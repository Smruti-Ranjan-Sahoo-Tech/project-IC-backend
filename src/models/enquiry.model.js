const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

const EnquiryModel = mongoose.model("Enquiry", enquirySchema);

module.exports = EnquiryModel;
