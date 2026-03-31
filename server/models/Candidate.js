import mongoose from 'mongoose'

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String },
  location: { type: String },

  // Resume
  resumeUrl:    { type: String },     // pre-signed S3 URL (short-lived, for display)
  resumeS3Key:  { type: String },     // raw S3 object key — use to regenerate signed URLs
  resumeText:   { type: String },     // extracted raw text
  vectorId:     { type: String },     // Pinecone vector ID

  // Skills & background
  skills: [{ type: String }],
  experience: { type: Number, default: 0 }, // years
  currentRole: { type: String },
  education: { type: String },
  linkedIn: { type: String },
  github: { type: String },

  // AI Scores
  resumeScore: { type: Number, min: 0, max: 100, default: 0 },
  codeScore:   { type: Number, min: 0, max: 100, default: 0 },
  interviewScore: { type: Number, min: 0, max: 100, default: 0 },
  totalScore:  { type: Number, min: 0, max: 100, default: 0 },

  // AI Feedback
  aiSummary: { type: String },
  strengths:  [{ type: String }],
  weaknesses: [{ type: String }],

  // Status
  status: {
    type: String,
    enum: ['applied', 'screening', 'interview', 'shortlisted', 'rejected', 'hired'],
    default: 'applied',
  },

  // Relations
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export default mongoose.model('Candidate', candidateSchema)
