import InterviewSession from '../models/InterviewSession.js'
import Candidate from '../models/Candidate.js'
import Job from '../models/Job.js'
import {
  startInterview, continueInterview,
  evaluateAnswer, generateInterviewSummary
} from '../services/interview.service.js'

// POST /api/interview/sessions
export const createSession = async (req, res) => {
  try {
    const { candidateId, jobId } = req.body
    const [candidate, job] = await Promise.all([
      Candidate.findById(candidateId),
      Job.findById(jobId),
    ])
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' })
    if (!job)       return res.status(404).json({ message: 'Job not found' })

    // Generate opening question from AI
    const opening = await startInterview({
      jobTitle: job.title,
      resumeText: candidate.resumeText,
      resumeSkills: candidate.skills,
    })

    const session = await InterviewSession.create({
      candidate: candidateId,
      job: jobId,
      recruiter: req.user._id,
      jobTitle: job.title,
      messages: [{ ...opening, timestamp: new Date() }],
      status: 'active',
      startedAt: new Date(),
      questionCount: 1,
    })

    await Candidate.findByIdAndUpdate(candidateId, { status: 'interview' })

    res.status(201).json({ session })
  } catch (err) {
    console.error('[Interview createSession]', err)
    res.status(500).json({ message: err.message })
  }
}

// POST /api/interview/sessions/:id/message  – Candidate replies
export const sendMessage = async (req, res) => {
  try {
    const { content } = req.body
    const session = await InterviewSession.findById(req.params.id)
      .populate('candidate', 'resumeText skills name')
      .populate('job', 'title')

    if (!session) return res.status(404).json({ message: 'Session not found' })
    if (session.status !== 'active') {
      return res.status(400).json({ message: 'Interview session is not active' })
    }

    // Add candidate message
    const candidateMsg = { role: 'candidate', content, timestamp: new Date() }
    session.messages.push(candidateMsg)

    // Evaluate the answer asynchronously (don't block)
    let evaluation = null
    try {
      const lastQuestion = session.messages
        .filter(m => m.role === 'interviewer')
        .slice(-1)[0]?.content || ''

      evaluation = await evaluateAnswer({
        question: lastQuestion,
        answer: content,
        jobTitle: session.job?.title || session.jobTitle,
      })

      // Attach score/feedback to the candidate message
      const lastIdx = session.messages.length - 1
      session.messages[lastIdx].score    = evaluation.score
      session.messages[lastIdx].feedback = evaluation.feedback
      session.messages[lastIdx].category = evaluation.category
    } catch { /* non-blocking */ }

    // Check if interview is complete (>= 7 questions or AI said thank you)
    const isWrappingUp = content.toLowerCase().includes('thank you') ||
      session.questionCount >= 7

    let nextMsg = null
    if (!isWrappingUp) {
      // Generate next interviewer message
      nextMsg = await continueInterview({
        jobTitle: session.job?.title || session.jobTitle,
        resumeText: session.candidate?.resumeText,
        resumeSkills: session.candidate?.skills,
        messages: session.messages,
        questionCount: session.questionCount,
      })
      session.messages.push({ ...nextMsg, timestamp: new Date() })
      session.questionCount += 1
    } else {
      session.status = 'completed'
      session.completedAt = new Date()
      session.durationMin = Math.round(
        (session.completedAt - session.startedAt) / 60000
      )

      // Generate summary
      try {
        const summary = await generateInterviewSummary({
          jobTitle: session.jobTitle,
          messages: session.messages,
        })
        session.scores.technical     = summary.technical || 0
        session.scores.behavioral    = summary.behavioral || 0
        session.scores.communication = summary.communication || 0
        session.scores.overall       = summary.overall || 0
        session.summary              = summary.summary || ''
        session.strengths            = summary.strengths || []
        session.concerns             = summary.concerns || []
        session.recommendation       = summary.recommendation || 'pending'

        // Update candidate interview score
        const interviewScore = summary.overall || 0
        const candidate = await Candidate.findById(session.candidate._id || session.candidate)
        if (candidate) {
          candidate.interviewScore = interviewScore
          candidate.totalScore = Math.round(
            (candidate.resumeScore   * 0.4) +
            (candidate.codeScore     * 0.3) +
            (interviewScore          * 0.3)
          )
          if (summary.recommendation === 'hire') candidate.status = 'shortlisted'
          else if (summary.recommendation === 'reject') candidate.status = 'rejected'
          await candidate.save()
        }
      } catch (e) {
        console.error('[Interview summary]', e.message)
      }
    }

    await session.save()

    res.json({
      session,
      nextMessage: nextMsg,
      evaluation,
      isComplete: session.status === 'completed',
    })
  } catch (err) {
    console.error('[Interview sendMessage]', err)
    res.status(500).json({ message: err.message })
  }
}

// GET /api/interview/sessions
export const getSessions = async (req, res) => {
  try {
    const sessions = await InterviewSession.find({ recruiter: req.user._id })
      .populate('candidate', 'name email')
      .populate('job', 'title company')
      .sort('-createdAt')
      .limit(50)
    res.json({ sessions })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/interview/sessions/:id
export const getSession = async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id)
      .populate('candidate', 'name email skills resumeScore codeScore')
      .populate('job', 'title company')
    if (!session) return res.status(404).json({ message: 'Session not found' })
    res.json({ session })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PATCH /api/interview/sessions/:id/end  – Force end session
export const endSession = async (req, res) => {
  try {
    const session = await InterviewSession.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    )
    if (!session) return res.status(404).json({ message: 'Session not found' })
    res.json({ session })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
