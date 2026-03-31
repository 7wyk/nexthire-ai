import mongoose from 'mongoose'

const testResultSchema = new mongoose.Schema(
  {
    input:    { type: String },
    expected: { type: String },
    actual:   { type: String },
    passed:   { type: Boolean },
    time:     { type: String },
    memory:   { type: String },
    error:    { type: String },
  },
  { _id: false }
)

const submissionSchema = new mongoose.Schema(
  {
    // Who submitted
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Which problem
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      index: true,
    },
    problemSlug: { type: String },

    // Optional: linked to a job application context
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      index: true,
      default: null,
    },

    // Submitted code
    code:     { type: String, required: true },
    language: { type: String, required: true },

    // Execution output
    stdout:        { type: String, default: '' },
    stderr:        { type: String, default: '' },
    compileOutput: { type: String, default: '' },

    // Verdict
    verdict: {
      type: String,
      enum: ['Accepted', 'Partial', 'Wrong Answer', 'Runtime Error', 'Compilation Error', 'Run'],
      default: 'Run',
    },
    status: {
      type: String,
      enum: ['pending', 'done', 'error'],
      default: 'done',
    },

    // Score metrics
    passed:   { type: Number, default: 0 },
    total:    { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },   // 0–100

    // Per-test details (hidden ones are scrubbed before response)
    testResults: [testResultSchema],

    // Execution metadata
    time:   { type: String },
    memory: { type: String },
  },
  { timestamps: true }
)

// Compound index for fetching "submissions by user for a problem"
submissionSchema.index({ userId: 1, problemId: 1, createdAt: -1 })

export default mongoose.model('Submission', submissionSchema)
