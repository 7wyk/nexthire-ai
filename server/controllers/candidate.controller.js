import Candidate from '../models/Candidate.js'

// GET /api/candidates
export const getCandidates = async (req, res) => {
  try {
    const { status, job, page = 1, limit = 10, sort = '-totalScore' } = req.query
    const filter = { createdBy: req.user._id }
    if (status) filter.status = status
    if (job)    filter.job = job

    const skip = (page - 1) * limit
    const [candidates, total] = await Promise.all([
      Candidate.find(filter)
        .populate('job', 'title company')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Candidate.countDocuments(filter),
    ])
    res.json({ candidates, total, page: Number(page), pages: Math.ceil(total / limit) })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/candidates
export const createCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.create({ ...req.body, createdBy: req.user._id })
    res.status(201).json({ candidate })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/candidates/:id
export const getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('job', 'title company')
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' })
    res.json({ candidate })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PUT /api/candidates/:id
export const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' })
    res.json({ candidate })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// DELETE /api/candidates/:id
export const deleteCandidate = async (req, res) => {
  try {
    const c = await Candidate.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id })
    if (!c) return res.status(404).json({ message: 'Candidate not found' })
    res.json({ message: 'Candidate deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// PATCH /api/candidates/:id/status
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body
    const candidate = await Candidate.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { status },
      { new: true }
    )
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' })
    res.json({ candidate })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
