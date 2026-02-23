const express = require("express");
const EnquiryController = require("../controller/enquiry.controller");
const verifyToken = require("../middleware/authMiddleware");
const authorization = require("../middleware/authorization");

const router = express.Router();

router.post("/submit", EnquiryController.submitEnquiry);
router.get("/all", verifyToken, authorization("admin"), EnquiryController.getAllEnquiries);

module.exports = router;
