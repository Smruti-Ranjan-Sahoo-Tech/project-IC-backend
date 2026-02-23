const mongoose = require("mongoose");

const userReviewPendingSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },
    answer: {
      type: String,
      required: false,
      default: "",
      trim: true
    },
    questionType: {
      type: String,
      required: true,
      enum: ["Interview", "Coding", "Subjective"]
    },
    cource: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    company: {
      type: String,
      required: true,
      trim: true
    },
    companyType: {
      type: String,
      required: true,
      enum: ["MNC", "Startup", "Other"],
      default: "Other"
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    submitterName: {
      type: String,
      required: true,
      trim: true
    },
    submitterEmail: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "rejected"],
      default: "pending"
    },
    rejectReason: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

const UserReviewPendingModel = mongoose.model("UserReviewPending", userReviewPendingSchema);

module.exports = UserReviewPendingModel;
