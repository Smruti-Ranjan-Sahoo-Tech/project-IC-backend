const PostModel = require("../models/post.model");
const CourseModel = require("../models/course.model");
const UserModel = require("../models/user.model");
const UserReviewPendingModel = require("../models/userReviewPending.model");
const EmailService = require("../config/email.config.js");

class UserController {
  static async getPostData(req, res) {
    try {
      const { subject, questionType } = req.params;
      const cource = (req.user?.cource || "").toString().trim();
      let { page = 1, limit = 10, companyType = "all", company = "all", location = "all" } = req.query;

      page = parseInt(page);
      limit = parseInt(limit);

      const skip = (page - 1) * limit;

      if (!cource) {
        return res.status(400).json({ success: false, message: "Course is missing for user" });
      }

      // Build filter object
      const filter = { cource };
      
      // Add questionType to filter only if provided
      if (questionType && questionType !== "" && questionType !== "all") {
        filter.questionType = questionType;
      }
      
      // Add subject to filter only if provided
      if (subject && subject !== "" && subject !== "all") {
        filter.subject = subject;
      }

      if (companyType && companyType !== "all") {
        filter.companyType = companyType.toString().trim();
      }

      if (company && company !== "all") {
        filter.company = company.toString().trim();
      }

      if (location && location !== "all") {
        filter.location = location.toString().trim();
      }

      const posts = await PostModel.find(filter)
        .populate("writtenBy", "username email role")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      
      const total = await PostModel.countDocuments(filter);
      
      return res.status(200).json({ 
        success: true, 
        page,
        limit,
        total, 
        totalPages: Math.ceil(total / limit), 
        posts 
      });

    } catch (error) {
      console.error("getPostData:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
  static async getSubjectName(req,res){
    try {
      const cource = (req.user?.cource || "").toString().trim();
      if (!cource) {
        return res.status(400).json({ success: false, message: "Course is missing for user" });
      }
      const subjects = await CourseModel.findOne({ course: cource }).select("subjects -_id");
      if (!subjects) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }
      return res.status(200).json({ success: true, subjects: subjects.subjects });
      
    } catch (error) {
       console.error("getSubjectName:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async addReview(req,res){
    try {
      const { id, username, email, cource } = req.user;
      const {
        company,
        companyType,
        location,
        questions
      } = req.body;

      if (!company || !companyType || !location) {
        return res.status(400).json({ success: false, message: "All review fields are required" });
      }

      if (!["MNC", "Startup", "Other"].includes(companyType)) {
        return res.status(400).json({ success: false, message: "Invalid company type" });
      }

      const normalizedCompany = company.toString().trim();
      const normalizedLocation = location.toString().trim();
      if (!normalizedCompany || !normalizedLocation) {
        return res.status(400).json({ success: false, message: "Company and location are required" });
      }

      const reviewItems = Array.isArray(questions) && questions.length > 0
        ? questions
        : [{
            question: req.body.question,
            answer: req.body.answer,
            questionType: req.body.questionType,
            subject: req.body.subject
          }];

      if (!reviewItems.length) {
        return res.status(400).json({ success: false, message: "At least one question is required" });
      }

      const courseData = await CourseModel.findOne({ course: cource }, { subjects: 1 }).lean();
      if (!courseData) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }

      const approvedSubjectSet = new Set(
        (courseData.subjects || [])
          .filter((item) => {
            const status = typeof item === "string" ? "approve" : item?.status;
            return status === "approve";
          })
          .map((item) => {
            const name = typeof item === "string" ? item : item?.name;
            return name ? name.toString().trim().toLowerCase() : "";
          })
          .filter(Boolean)
      );

      const docsToCreate = [];

      for (const review of reviewItems) {
        const question = (review?.question || "").toString().trim();
        const answer = (review?.answer || "").toString().trim();
        const questionType = (review?.questionType || "").toString().trim();
        const subject = (review?.subject || "").toString().trim();

        if (!question || !questionType || !subject) {
          return res.status(400).json({ success: false, message: "Every question item must include subject, question type, and question" });
        }

        if (!["Interview", "Coding", "Subjective"].includes(questionType)) {
          return res.status(400).json({ success: false, message: "Invalid question type in one of review items" });
        }

        if (!approvedSubjectSet.has(subject.toLowerCase())) {
          return res.status(400).json({ success: false, message: `Subject '${subject}' is not approved for this course` });
        }

        docsToCreate.push({
          question,
          answer,
          questionType,
          cource,
          subject,
          company: normalizedCompany,
          companyType,
          location: normalizedLocation,
          submittedBy: id,
          submitterName: username,
          submitterEmail: email
        });
      }

      const pendingReviews = await UserReviewPendingModel.insertMany(docsToCreate);

      const superAdminEmail = process.env.S_ADMIN_EMAIL;
      await EmailService(
        superAdminEmail,
        "New User Review Submission Pending Verification",
        `<p>A user has submitted a new interview review.</p>
         <ul>
           <li><strong>User:</strong> ${username} (${email})</li>
           <li><strong>Course:</strong> ${cource}</li>
           <li><strong>Company:</strong> ${normalizedCompany}</li>
           <li><strong>Company Type:</strong> ${companyType}</li>
           <li><strong>Location:</strong> ${normalizedLocation}</li>
           <li><strong>Total Questions:</strong> ${pendingReviews.length}</li>
         </ul>
         <p>Please verify this review in SuperAdmin panel.</p>`
      );

      await EmailService(
        email,
        "Review Submitted - Pending Verification",
        `<p>Dear ${username},</p>
         <p>Your review has been submitted successfully and is currently under SuperAdmin verification.</p>
         <ul>
           <li><strong>Company:</strong> ${normalizedCompany}</li>
           <li><strong>Total Questions:</strong> ${pendingReviews.length}</li>
           <li><strong>Status:</strong> Pending</li>
         </ul>`
      );

      return res.status(201).json({
        success: true,
        message: "Review submitted and sent for verification",
        reviews: pendingReviews
      });
    } catch (error) {
      console.error("addReviewError:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
  static async getReview(req,res){
    try {
      const { id } = req.user;

      const [pendingReviews, approvedReviews] = await Promise.all([
        UserReviewPendingModel.find({ submittedBy: id })
          .sort({ createdAt: -1 })
          .lean(),
        PostModel.find({ writtenBy: id })
          .sort({ createdAt: -1 })
          .lean()
      ]);

      return res.status(200).json({
        success: true,
        pendingReviews,
        approvedReviews
      });
    } catch (error) {
      console.error("getReviewError:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async getAllUserReviews(req, res) {
    try {
      const {
        subject = "",
        questionType = "",
        companyType = "all",
        company = "all",
        location = "all",
        page = 1,
        limit = 10
      } = req.query;

      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
      const skip = (pageNum - 1) * limitNum;

      const normalizedCourse = (req.user?.cource || "").toString().trim();
      if (!normalizedCourse) {
        return res.status(400).json({ success: false, message: "Course is required" });
      }

      const userAuthors = await UserModel.find(
        { role: "user", cource: normalizedCourse },
        { _id: 1 }
      ).lean();
      const authorIds = userAuthors.map((item) => item._id);

      if (!authorIds.length) {
        return res.status(200).json({
          success: true,
          page: pageNum,
          limit: limitNum,
          total: 0,
          totalPages: 0,
          reviews: []
        });
      }

      const filter = {
        writtenBy: { $in: authorIds },
        cource: normalizedCourse
      };

      if (subject && subject !== "all") {
        filter.subject = subject.toString().trim();
      }
      if (questionType && questionType !== "all") {
        filter.questionType = questionType.toString().trim();
      }
      if (companyType && companyType !== "all") {
        filter.companyType = companyType.toString().trim();
      }
      if (company && company !== "all") {
        filter.company = company.toString().trim();
      }
      if (location && location !== "all") {
        filter.location = { $regex: `^${location.toString().trim()}$`, $options: "i" };
      }

      const [reviews, total] = await Promise.all([
        PostModel.find(filter)
          .populate("writtenBy", "username email role")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        PostModel.countDocuments(filter)
      ]);

      return res.status(200).json({
        success: true,
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        reviews
      });
    } catch (error) {
      console.error("getAllUserReviewsError:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}

module.exports = UserController;
