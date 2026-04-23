const mongoose = require("mongoose");

const LearningSessionSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  videoId: { type: String, required: true },
  videoTitle: { type: String },
  thumbnail: { type: String },
  summary: { type: String },
  quiz: [{
    question: String,
    options: [String],
    correct_answer: String,
    explanation: String,
    source_timestamp: String
  }],
  userProgress: {
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} }, // questionIndex -> selectedOption
    isCompleted: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

LearningSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const LearningSession = mongoose.model("LearningSession", LearningSessionSchema);

module.exports = LearningSession;
