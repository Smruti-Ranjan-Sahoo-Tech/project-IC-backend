const mongoose = require("mongoose");

const userNoteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: ""
    },
    pdfUrl: {
      type: String,
      required: true,
      trim: true
    },
    pdfPublicId: {
      type: String,
      required: true,
      trim: true
    },
    pdfOriginalName: {
      type: String,
      trim: true,
      default: ""
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
    writtenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

const UserNoteModel = mongoose.model("UserNote", userNoteSchema);

module.exports = UserNoteModel;
