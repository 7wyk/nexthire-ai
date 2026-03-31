import fs from 'fs'
import { uploadToS3, getSignedDownloadUrl } from '../services/aws.service.js'
import Candidate from '../models/Candidate.js'
import logger from '../config/logger.js'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/upload/resume
// multipart/form-data  |  field: "resume"  |  PDF / DOC / DOCX / TXT (max 5 MB)
//
// Optional body fields:
//   candidateId  – link uploaded file to an existing Candidate document
//
// Returns:
//   { key, url, signedUrl, candidateId? }
// ─────────────────────────────────────────────────────────────────────────────
export const uploadResume = async (req, res) => {
  const filePath = req.file?.path

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Resume file is required (PDF, DOC, DOCX or TXT)' })
    }

    // 1. Upload to S3 (private object — access via signed URL)
    const { key, url } = await uploadToS3({
      source:   filePath,
      filename: req.file.originalname,
      folder:   'resumes',
      isPublic: false,          // private bucket — use signed URLs for access
    })

    // 2. Generate a short-lived signed URL (1 hour) for immediate preview
    const signedUrl = await getSignedDownloadUrl(key, 3600)

    // 3. If a candidateId was provided, persist the S3 key + signed URL
    let candidate = null
    if (req.body.candidateId) {
      candidate = await Candidate.findByIdAndUpdate(
        req.body.candidateId,
        {
          resumeUrl: signedUrl,   // store signed URL (refreshable via key)
          resumeS3Key: key,       // store raw key for future signed URL generation
        },
        { new: true, select: '_id name email resumeUrl resumeS3Key' },
      )
    }

    // 4. Clean up temp file from disk
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)

    logger.info('[Upload] Resume uploaded to S3', {
      key,
      uploadedBy: req.user._id,
      candidateId: req.body.candidateId || null,
    })

    return res.status(201).json({
      message:     'Resume uploaded successfully',
      key,          // S3 object key — save this to regenerate signed URLs
      url,          // public URL (empty string if bucket is private)
      signedUrl,    // pre-signed URL, valid for 1 hour
      ...(candidate && { candidate }),
    })
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)
    logger.error('[Upload] Resume upload failed', { error: err.message })
    return res.status(500).json({ message: err.message || 'Upload failed' })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/upload/resume/:candidateId/signed-url
// Regenerate a fresh signed download URL for a candidate's resume.
// Returns: { signedUrl }
// ─────────────────────────────────────────────────────────────────────────────
export const getResumeSignedUrl = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId)
      .select('resumeS3Key name')

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' })
    }
    if (!candidate.resumeS3Key) {
      return res.status(404).json({ message: 'No resume found for this candidate' })
    }

    const signedUrl = await getSignedDownloadUrl(candidate.resumeS3Key, 3600)

    return res.json({
      signedUrl,
      expiresIn: 3600,
      candidate: candidate.name,
    })
  } catch (err) {
    logger.error('[Upload] Signed URL generation failed', { error: err.message })
    return res.status(500).json({ message: err.message })
  }
}
