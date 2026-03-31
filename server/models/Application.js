import mongoose from 'mongoose'

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate reference is required'],
    },
    coverLetter: {
      type: String,
      maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'shortlisted', 'rejected', 'hired'],
      default: 'applied',
    },
    // Recruiter notes — not visible to candidate
    recruiterNote: { type: String, maxlength: 1000, select: false },
  },
  { timestamps: true }
)

// One candidate can only apply once per job
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true })

export default mongoose.model('Application', applicationSchema)
