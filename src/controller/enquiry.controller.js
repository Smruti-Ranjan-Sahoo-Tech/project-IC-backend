const EnquiryModel = require("../models/enquiry.model");

class EnquiryController {
  static async submitEnquiry(req, res) {
    try {
      const { name, email, subject, message } = req.body || {};
      const enquiry = await EnquiryModel.create({
        name: (name || "").toString().trim(),
        email: (email || "").toString().trim(),
        subject: (subject || "").toString().trim(),
        message: (message || "").toString().trim()
      });

      return res.status(201).json({
        success: true,
        message: "Enquiry submitted successfully",
        data: enquiry
      });
    } catch (error) {
      console.error("submitEnquiryError:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async getAllEnquiries(req, res) {
    try {
      const enquiries = await EnquiryModel.find().sort({ createdAt: -1 }).lean();
      return res.status(200).json({
        success: true,
        count: enquiries.length,
        data: enquiries
      });
    } catch (error) {
      console.error("getAllEnquiriesError:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

module.exports = EnquiryController;
