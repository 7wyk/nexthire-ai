import Candidate from '../models/Candidate.js'
import Job from '../models/Job.js'
import { extractTextFromFile } from '../services/parser.service.js'
import { screenResumeWithAI } from '../services/ai.service.js'
import { upsertResumeVector, matchJobToResumes } from '../services/vector.service.js'
import { uploadToS3, getSignedDownloadUrl } from '../services/aws.service.js'
import fs from 'fs'

/**
 * POST /api/resume/screen
 * Upload a resume file + jobId → AI screening result
 */
export const screenResume = async (req, res) => {
  const filePath = req.file?.path

  try {
    const { jobId, candidateName, candidateEmail } = req.body

    if (!req.file) return res.status(400).json({ message: 'Resume file is required' })
    if (!jobId)    return res.status(400).json({ message: 'jobId is required' })

    // 1. Fetch job description
    const job = await Job.findById(jobId)
    if (!job) return res.status(404).json({ message: 'Job not found' })

    // 2. Extract text from resume (while file is still on disk)
    const resumeText = await extractTextFromFile(filePath)
    if (!resumeText || resumeText.length < 50) {
      return res.status(422).json({ message: 'Could not extract enough text from the file' })
    }

    // 3. Upload resume to S3 (private, access via signed URL)
    let resumeS3Key  = null
    let resumeUrl    = req.file.filename   // fallback: local name if S3 not configured

    if (process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET) {
      try {
        const s3Result  = await uploadToS3({
          source:   filePath,
          filename: req.file.originalname,
          folder:   'resumes',
          isPublic: false,
        })
        resumeS3Key = s3Result.key
        resumeUrl   = await getSignedDownloadUrl(resumeS3Key, 3600)
      } catch (s3Err) {
        console.warn('[Resume Screen] S3 upload skipped:', s3Err.message)
        // Non-blocking — continue with local filename
      }
    }

    // 4. Clean up temp disk file
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)

    // 5. Groq AI screening
    const jobDescription = `${job.title} at ${job.company}.\n${job.description}\nRequired skills: ${job.skills?.join(', ')}`
    const aiResult = await screenResumeWithAI(resumeText, jobDescription)

    // 6. Create or update Candidate
    let candidate = await Candidate.findOne({ email: candidateEmail, job: jobId })
    if (!candidate) {
      candidate = new Candidate({
        name: candidateName || 'Unknown',
        email: candidateEmail || `auto-${Date.now()}@nexthire.ai`,
        job: jobId,
        createdBy: req.user._id,
      })
    }

    candidate.resumeText   = resumeText.substring(0, 5000)
    candidate.resumeUrl    = resumeUrl          // signed S3 URL (or local fallback)
    candidate.resumeS3Key  = resumeS3Key        // raw key for future URL refresh
    candidate.skills       = aiResult.skills || []
    candidate.experience   = aiResult.experience || 0
    candidate.resumeScore  = aiResult.score || 0
    candidate.aiSummary    = aiResult.summary || ''
    candidate.strengths    = aiResult.strengths || []
    candidate.weaknesses   = aiResult.weaknesses || []
    candidate.totalScore   = aiResult.score || 0

    if (aiResult.recommendation === 'hire' || aiResult.recommendation === 'interview') {
      candidate.status = 'screening'
    }

    await candidate.save()

    // 7. Upsert vector into Pinecone (async – don't block response)
    upsertResumeVector(candidate._id, resumeText, {
      name:   candidate.name,
      email:  candidate.email,
      skills: candidate.skills,
      score:  candidate.resumeScore,
    }).catch(console.error)

    // 8. Increment job applicant count
    await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } })

    res.status(201).json({
      candidate,
      aiResult,
      message: `Resume screened successfully. Score: ${aiResult.score}/100`,
    })
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
    console.error('[Resume Screen]', err)
    res.status(500).json({ message: err.message || 'Screening failed' })
  }
}


/**
 * POST /api/resume/match
 * Match a job's description against all stored resume vectors
 */
export const matchResumes = async (req, res) => {
  try {
    const { jobId, topK = 10 } = req.body
    const job = await Job.findById(jobId)
    if (!job) return res.status(404).json({ message: 'Job not found' })

    const jobDescription = `${job.title}\n${job.description}\nSkills: ${job.skills?.join(', ')}`
    const matches = await matchJobToResumes(jobDescription, topK)

    // Enrich with DB data
    const ids = matches.map(m => m.candidateId)
    const candidates = await Candidate.find({ _id: { $in: ids } })
      .populate('job', 'title')
      .lean()

    const enriched = matches.map(m => ({
      ...m,
      candidate: candidates.find(c => c._id.toString() === m.candidateId),
    })).filter(m => m.candidate)

    res.json({ matches: enriched, count: enriched.length })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/**
 * GET /api/resume/history
 * Get all screened resumes for this recruiter
 */
export const getScreeningHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit
    const candidates = await Candidate.find({ createdBy: req.user._id, resumeScore: { $gt: 0 } })
      .populate('job', 'title company')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit))
    res.json({ candidates })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
