import Application from '../models/Application.js'
import Job from '../models/Job.js'

// ─── CANDIDATE ──────────────────────────────────────────────────────────────

/**
 * POST /api/applications
 * Candidate applies to a job.
 */
export const applyToJob = async (req, res) => {
  try {
    const { jobId, coverLetter } = req.body

    if (!jobId)
      return res.status(400).json({ message: 'jobId is required' })

    // Confirm job exists and is active
    const job = await Job.findOne({ _id: jobId, status: 'active' })
    if (!job)
      return res.status(404).json({ message: 'Job not found or no longer active' })

    // Create application (unique index will reject duplicates)
    const application = await Application.create({
      job: jobId,
      candidate: req.user._id,
      coverLetter,
    })

    // Increment job applicant counter
    await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } })

    const populated = await application.populate('job', 'title company location')
    res.status(201).json({ application: populated })
  } catch (err) {
    // Mongoose duplicate key error
    if (err.code === 11000)
      return res.status(409).json({ message: 'You have already applied to this job' })
    res.status(500).json({ message: err.message })
  }
}

/**
 * GET /api/applications/mine
 * Candidate views their own applications.
 */
export const getMyApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query
    const filter = { candidate: req.user._id }
    if (status) filter.status = status

    const skip = (Number(page) - 1) * Number(limit)
    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('job', 'title company location type status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(filter),
    ])

    res.json({
      applications,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/**
 * DELETE /api/applications/:id
 * Candidate withdraws their application (only if still 'applied').
 */
export const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      candidate: req.user._id,
    })

    if (!application)
      return res.status(404).json({ message: 'Application not found' })

    if (application.status !== 'applied')
      return res.status(400).json({ message: 'Cannot withdraw — application is already in review' })

    await application.deleteOne()
    await Job.findByIdAndUpdate(application.job, { $inc: { applicantCount: -1 } })

    res.json({ message: 'Application withdrawn successfully' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// ─── RECRUITER ──────────────────────────────────────────────────────────────

/**
 * GET /api/applications/job/:jobId
 * Recruiter views all applicants for one of their jobs.
 */
export const getApplicantsByJob = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, sort = '-createdAt' } = req.query

    // Ensure the job belongs to this recruiter
    const job = await Job.findOne({ _id: req.params.jobId, recruiter: req.user._id })
    if (!job)
      return res.status(404).json({ message: 'Job not found or access denied' })

    const filter = { job: req.params.jobId }
    if (status) filter.status = status

    const skip = (Number(page) - 1) * Number(limit)
    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate('candidate', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Application.countDocuments(filter),
    ])

    res.json({
      job: { id: job._id, title: job.title, company: job.company },
      applications,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

/**
 * PATCH /api/applications/:id/status
 * Recruiter updates the status of an application.
 */
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status, recruiterNote } = req.body

    const VALID_STATUSES = ['applied', 'screening', 'interview', 'shortlisted', 'rejected', 'hired']
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` })

    // Verify the application's job belongs to this recruiter
    const application = await Application.findById(req.params.id).populate('job', 'recruiter')
    if (!application)
      return res.status(404).json({ message: 'Application not found' })

    if (String(application.job.recruiter) !== String(req.user._id))
      return res.status(403).json({ message: 'Not authorized to update this application' })

    const update = { status }
    if (recruiterNote !== undefined) update.recruiterNote = recruiterNote

    const updated = await Application.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('candidate', 'name email')
      .populate('job', 'title company')

    res.json({ application: updated })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
