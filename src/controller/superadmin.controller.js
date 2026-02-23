const AdminAcessRequestModel = require("../models/AdminAccessRequest.model.js.js");
const UserModel = require("../models/user.model");
const CourseModel = require("../models/course.model");
const PostModel = require("../models/post.model");
const UserReviewPendingModel = require("../models/userReviewPending.model");
const EnquiryModel = require("../models/enquiry.model");
const EmailService = require("../config/email.config.js");
const generateToken = require("../utils/generateToken.js");
const jwt = require("jsonwebtoken");

class SuperadminController {
    static mapPendingSubjects(courses = []) {
        return courses.flatMap((courseItem) =>
            (courseItem.subjects || [])
                .filter((subjectItem) => ["pending", "delete_pending"].includes(subjectItem?.status))
                .map((subjectItem) => ({
                    courseId: courseItem._id,
                    course: courseItem.course,
                    subjectId: subjectItem._id,
                    name: subjectItem.name,
                    status: subjectItem.status,
                    requestType: subjectItem.status === "delete_pending" ? "delete" : "add",
                    requesterAdminName: subjectItem.requesterAdminName || "Unknown Admin",
                    requesterAdminEmail: subjectItem.requesterAdminEmail || ""
                }))
        );
    }

    static async superAdminLogin(req, res) {
        const { email, password } = req.body;

        if (
            email === process.env.S_ADMIN_EMAIL &&
            password === process.env.SUPERADMIN_PASSWORD
        ) {
            const token = generateToken({ email, role: "superadmin" });
            res.cookie("token", token, {
                httpOnly: true,
                sameSite: "strict",
                maxAge: 24 * 60 * 60 * 1000 // 1 day
            });
            return res.redirect("/superadmin/admin-requests");
        }

        return res.render("superadmin/login", {
            error: "Invalid credentials"
        });
    }

    // Get all admin requests
    static async getAllAdminRequestUser(req, res) {
        try {
            const allUsers = await AdminAcessRequestModel.find();
            return res.render("superadmin/admin-requests", { data: allUsers });
        } catch (error) {
            console.log("getAllAdminRequestUser:", error.message);
            return res.status(500).render("superadmin/error", { message: "Internal server error" });
        }
    }

    // Accept ALL admin requests
    static async AcceptAllAdminRequest(req, res) {
        try {
            const requests = await AdminAcessRequestModel.find();

            if (!requests.length) {
                return res.status(404).json({ message: "No admin requests found" });
            }

            await Promise.all(
                requests.map(async (reqUser) => {
                    await UserModel.create({
                        username: reqUser.username,
                        email: reqUser.email,
                        hashPassword: reqUser.hashPassword,
                        role: "admin",
                        phone: reqUser.phone,
                        cource: reqUser.cource
                    });

                    // Generate password reset token
                    const resetToken = jwt.sign({ id: reqUser._id }, process.env.JWT_SERVER_SECREAT, { expiresIn: "1h" });
                    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

                    // Professional email to approved admin with password reset link
                    await EmailService(
                        reqUser.email,
                        "Admin Account Verified - Set Your Password",
                        `<p>Dear ${reqUser.username},</p>
                        <p>We are pleased to inform you that your admin account has been successfully verified and approved.</p>
                        <p>To complete your account setup, please click the button below to set your password:</p>
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set Your Password</a>
                        </p>
                        <p><strong>Important:</strong> This link will expire in 1 hour.</p>
                        <p>If the button above doesn't work, copy and paste this link in your browser:</p>
                        <p>${resetUrl}</p>
                        <p>Welcome to the team!</p>
                        <p>Best regards,<br/>Project-IC SuperAdmin Team</p>`
                    );
                })
            );

            await AdminAcessRequestModel.deleteMany();

            return res.redirect("/superadmin/admin-requests");

        } catch (error) {
            console.log("AcceptAllAdminRequest:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }


    //  Delete ALL admin requests
    static async DeleteAllAdminRequest(req, res) {
        try {
            const requests = await AdminAcessRequestModel.find();

            if (requests.length > 0) {
                await Promise.all(
                    requests.map(async (reqUser) => {
                        await EmailService(
                            reqUser.email,
                            "Admin Request Status Update",
                            `<p>Dear ${reqUser.username},</p>
                            <p>Thank you for your interest in becoming an admin. Unfortunately, your admin request has been declined at this time.</p>
                            <p>If you have any questions or would like more information, please feel free to contact our support team.</p>
                            <p>Best regards,<br/>Project-IC SuperAdmin Team</p>`
                        );
                    })
                );
            }

            await AdminAcessRequestModel.deleteMany();
            return res.redirect("/superadmin/admin-requests");
        } catch (error) {
            console.log("DeleteAllAdminRequest:", error.message);
            return res.redirect("/superadmin/admin-requests");
        }
    }
    // Accept SINGLE admin request
    static async AcceptAdminRequest(req, res) {
        try {
            const { id } = req.params;

            const reqUser = await AdminAcessRequestModel.findById(id);
            if (!reqUser) {
                return res.status(404).json({ message: "Admin request not found" });
            }

            const newAdmin = await UserModel.create({
                username: reqUser.username,
                email: reqUser.email,
                hashPassword: reqUser.hashPassword,
                role: "admin",
                phone: reqUser.phone,
                cource: reqUser.cource
            });

            // Generate password reset token
            const resetToken = jwt.sign({ id: newAdmin._id }, process.env.JWT_SERVER_SECREAT, { expiresIn: "1h" });
            const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;

            await AdminAcessRequestModel.findByIdAndDelete(id);

            // Professional email to approved admin with password reset link
            await EmailService(
                reqUser.email,
                "Admin Account Verified - Set Your Password",
                `<p>Dear ${reqUser.username},</p>
                <p>We are pleased to inform you that your admin account has been successfully verified and approved.</p>
                <p>To complete your account setup, please click the button below to set your password:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set Your Password</a>
                </p>
                <p><strong>Important:</strong> This link will expire in 1 hour.</p>
                <p>If the button above doesn't work, copy and paste this link in your browser:</p>
                <p>${resetUrl}</p>
                <p>Welcome to the team!</p>
                <p>Best regards,<br/>Project-IC SuperAdmin Team</p>`
            );

            return res.redirect("/superadmin/admin-requests");

        } catch (error) {
            console.log("AcceptAdminRequest:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    //  Delete SINGLE admin request
    static async DeleteAdminRequest(req, res) {
        try {
            const { id } = req.params;

            const deleted = await AdminAcessRequestModel.findByIdAndDelete(id);
            if (!deleted) {
                return res.status(404).json({ message: "Admin request not found" });
            }

            await EmailService(
                deleted.email,
                "Admin Request Status Update",
                `<p>Dear ${deleted.username},</p>
                <p>Thank you for your interest in becoming an admin. Unfortunately, your admin request has been declined at this time.</p>
                <p>If you have any questions or would like more information, please feel free to contact our support team.</p>
                <p>Best regards,<br/>Project-IC SuperAdmin Team</p>`
            );

            return res.redirect("/superadmin/admin-requests");

        } catch (error) {
            console.log("DeleteAdminRequest:", error.message);
            return res.redirect("/superadmin/admin-requests");
        }
    }
    static async getAllAdminDetails(req, res) {
        try {
            const admins = await UserModel.find({ role: "admin" })
            return res.render("superadmin/admin-details", { data: admins })

        } catch (error) {
            console.log("getAllAdminDetails:", error.message);
            return res.redirect("/superadmin/admin-details");

        }
    }
    static async adminDelete(req, res) {
        const { id } = req.params
        try {
            const deleted = await UserModel.findByIdAndDelete(id)
            if (!deleted) {
                return res.status(404).json({ message: "Admin not found" })
            }
            EmailService(
                deleted.email,
                "Admin Account Terminated",
                `<p>Dear ${deleted.username},</p>
                <p>We regret to inform you that your admin account has been terminated by the SuperAdmin.</p>
                <p>If you believe this is a mistake or have any questions, please contact our support team.</p>
                <p>Best regards,<br/>Project-IC SuperAdmin Team</p>`
            );
            return res.redirect("/superadmin/admin-details")
        } catch (error) {
            console.log("DeleteAdminRequest:", error.message);
            return res.redirect("/superadmin/admin-details");
        }

    }
    static async logout(req, res) {
        res.clearCookie('token');
        res.redirect('/superadmin/login');
    }
    static async freezeAdmin(req, res) {
            try {
                const { id } = req.params;
    
                const user = await UserModel.findByIdAndUpdate(
                    id,
                    { isBlocked: true },
                    { new: true }
                );
    
                if (!user) {
                    return res.status(404).json({
                        message: "Admin not found"
                    });
                }

                // Send professional email to frozen admin
                await EmailService(
                    user.email,
                    "Admin Account Suspended",
                    `<p>Dear ${user.username},</p>
                    <p>Your admin account has been suspended by the SuperAdmin.</p>
                    <p>You are temporarily unable to access your admin dashboard and perform admin functions.</p>
                    <p>For more information or to appeal this decision, please contact our support team.</p>
                    <p>Best regards,<br/>Project-IC SuperAdmin Team</p>`
                );
    
                return res.status(200).json({
                    message: "Admin account suspended successfully"
                });
    
            } catch (error) {
                console.error("freezeAdminError:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        }
    
    static async unfreezeAdmin(req, res) {
            try {
                const { id } = req.params;
                const user = await UserModel.findByIdAndUpdate(
                    id,
                    { isBlocked : false },
                    { new :  true }
                )
                if (!user) {
                    return res.status(404).json({
                        message: "Admin not found"
                    });
                }

                // Send professional email to unfrozen admin
                await EmailService(
                    user.email,
                    "Admin Account Reactivated",
                    `<p>Dear ${user.username},</p>
                    <p>Good news! Your admin account has been reactivated by the SuperAdmin.</p>
                    <p>You now have full access to your admin dashboard and can resume your administrative functions.</p>
                    <p>If you have any questions, please contact our support team.</p>
                    <p>Best regards,<br/>Project-IC SuperAdmin Team</p>`
                );

                return res.status(200).json({
                    message: "Admin account reactivated successfully"
                });
    
            } catch (error) {
                console.error("unfreezeAdminError:", error.message);
                return res.status(500).json({ success: false, message: "Internal server error" });
            }
        }

    static async getPendingCourseSubjects(req, res) {
        try {
            const filterEmail = (req.query?.adminEmail || "").toString().trim().toLowerCase();
            const courses = await CourseModel.find(
                { "subjects.status": { $in: ["pending", "delete_pending"] } },
                { course: 1, subjects: 1 }
            ).lean();

            let pendingRequests = SuperadminController.mapPendingSubjects(courses);
            if (filterEmail) {
                pendingRequests = pendingRequests.filter(
                    (item) => (item.requesterAdminEmail || "").toLowerCase() === filterEmail
                );
            }

            return res.status(200).json({
                success: true,
                count: pendingRequests.length,
                data: pendingRequests
            });
        } catch (error) {
            console.error("getPendingCourseSubjectsError:", error.message);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    static async dashboardPage(req, res) {
        try {
            const [pendingAdminRequestsCount, pendingUserReviewsCount, pendingSubjectCourses] = await Promise.all([
                AdminAcessRequestModel.countDocuments(),
                UserReviewPendingModel.countDocuments({ status: "pending" }),
                CourseModel.find({ "subjects.status": { $in: ["pending", "delete_pending"] } }, { course: 1, subjects: 1 }).lean()
            ]);

            const pendingCourseSubjectsCount = SuperadminController.mapPendingSubjects(pendingSubjectCourses).length;

            return res.render("superadmin/dashboard", {
                stats: {
                    pendingAdminRequestsCount,
                    pendingUserReviewsCount,
                    pendingCourseSubjectsCount
                }
            });
        } catch (error) {
            console.error("dashboardPageError:", error.message);
            return res.status(500).render("superadmin/error", { message: "Internal server error" });
        }
    }

    static async pendingCourseSubjectsPage(req, res) {
        try {
            const filterEmail = (req.query?.adminEmail || "").toString().trim().toLowerCase();
            const courses = await CourseModel.find(
                { "subjects.status": { $in: ["pending", "delete_pending"] } },
                { course: 1, subjects: 1 }
            ).lean();

            let pendingRequests = SuperadminController.mapPendingSubjects(courses);
            const requestAdmins = Array.from(
                new Map(
                    pendingRequests
                        .filter((item) => item.requesterAdminEmail)
                        .map((item) => [
                            item.requesterAdminEmail.toLowerCase(),
                            { name: item.requesterAdminName || "Unknown Admin", email: item.requesterAdminEmail }
                        ])
                ).values()
            );

            if (filterEmail) {
                pendingRequests = pendingRequests.filter(
                    (item) => (item.requesterAdminEmail || "").toLowerCase() === filterEmail
                );
            }

            return res.render("superadmin/pending-course-subjects", {
                data: pendingRequests,
                requestAdmins,
                selectedAdminEmail: filterEmail
            });
        } catch (error) {
            console.error("pendingCourseSubjectsPageError:", error.message);
            return res.status(500).render("superadmin/error", { message: "Internal server error" });
        }
    }

    static async approveCourseSubject(req, res) {
        try {
            const { courseId, subjectId } = req.params;
            const course = await CourseModel.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: "Course not found"
                });
            }

            const subject = course.subjects.id(subjectId);
            if (!subject) {
                return res.status(404).json({
                    success: false,
                    message: "Subject not found"
                });
            }

            if (subject.status === "pending") {
                subject.status = "approve";
            } else if (subject.status === "delete_pending") {
                course.subjects = course.subjects.filter((item) => item._id.toString() !== subjectId);
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Only pending requests can be approved"
                });
            }

            await course.save();

            return res.status(200).json({
                success: true,
                message: "Subject request approved successfully"
            });
        } catch (error) {
            console.error("approveCourseSubjectError:", error.message);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    static async rejectCourseSubject(req, res) {
        try {
            const { courseId, subjectId } = req.params;
            const course = await CourseModel.findById(courseId);
            if (!course) {
                return res.status(404).json({
                    success: false,
                    message: "Course not found"
                });
            }

            const subject = course.subjects.id(subjectId);
            if (!subject) {
                return res.status(404).json({
                    success: false,
                    message: "Subject not found"
                });
            }

            if (subject.status === "pending") {
                subject.status = "rejected";
            } else if (subject.status === "delete_pending") {
                subject.status = "approve";
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Only pending requests can be rejected"
                });
            }

            await course.save();

            return res.status(200).json({
                success: true,
                message: "Subject request rejected successfully"
            });
        } catch (error) {
            console.error("rejectCourseSubjectError:", error.message);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    static async getPendingUserReviews(req, res) {
        try {
            const filterEmail = (req.query?.submitterEmail || "").toString().trim().toLowerCase();
            const filter = { status: "pending" };
            if (filterEmail) {
                filter.submitterEmail = filterEmail;
            }

            const reviews = await UserReviewPendingModel.find(filter)
                .sort({ createdAt: -1 })
                .lean();

            return res.status(200).json({
                success: true,
                count: reviews.length,
                data: reviews
            });
        } catch (error) {
            console.error("getPendingUserReviewsError:", error.message);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    static async pendingUserReviewsPage(req, res) {
        try {
            const filterEmail = (req.query?.submitterEmail || "").toString().trim().toLowerCase();

            const allPending = await UserReviewPendingModel.find({ status: "pending" })
                .sort({ createdAt: -1 })
                .lean();

            const submitters = Array.from(
                new Map(
                    allPending
                        .filter((item) => item.submitterEmail)
                        .map((item) => [
                            item.submitterEmail.toLowerCase(),
                            { name: item.submitterName || "Unknown User", email: item.submitterEmail }
                        ])
                ).values()
            );

            const reviews = filterEmail
                ? allPending.filter((item) => (item.submitterEmail || "").toLowerCase() === filterEmail)
                : allPending;

            return res.render("superadmin/pending-user-reviews", {
                data: reviews,
                submitters,
                selectedSubmitterEmail: filterEmail
            });
        } catch (error) {
            console.error("pendingUserReviewsPageError:", error.message);
            return res.status(500).render("superadmin/error", { message: "Internal server error" });
        }
    }

    static async usersPage(req, res) {
        try {
            const users = await UserModel.find({ role: "user" })
                .select("username email phone cource isBlocked")
                .sort({ createdAt: -1 })
                .lean();

            return res.render("superadmin/users", { data: users });
        } catch (error) {
            console.error("usersPageError:", error.message);
            return res.status(500).render("superadmin/error", { message: "Internal server error" });
        }
    }

    static async freezeUser(req, res) {
        try {
            const { id } = req.params;
            const user = await UserModel.findByIdAndUpdate(id, { isBlocked: true }, { new: true });
            if (!user) return res.status(404).json({ success: false, message: "User not found" });
            return res.status(200).json({ success: true, message: "User blocked successfully" });
        } catch (error) {
            console.error("freezeUserBySuperAdminError:", error.message);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    static async unfreezeUser(req, res) {
        try {
            const { id } = req.params;
            const user = await UserModel.findByIdAndUpdate(id, { isBlocked: false }, { new: true });
            if (!user) return res.status(404).json({ success: false, message: "User not found" });
            return res.status(200).json({ success: true, message: "User unblocked successfully" });
        } catch (error) {
            console.error("unfreezeUserBySuperAdminError:", error.message);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    static async enquiriesPage(req, res) {
        try {
            const enquiries = await EnquiryModel.find().sort({ createdAt: -1 }).lean();
            return res.render("superadmin/enquiries", { data: enquiries });
        } catch (error) {
            console.error("enquiriesPageError:", error.message);
            return res.status(500).render("superadmin/error", { message: "Internal server error" });
        }
    }

    static async approveUserReview(req, res) {
        try {
            const { id } = req.params;
            const pendingReview = await UserReviewPendingModel.findOne({ _id: id, status: "pending" });

            if (!pendingReview) {
                return res.status(404).json({
                    success: false,
                    message: "Pending review not found"
                });
            }

            const post = await PostModel.create({
                question: pendingReview.question,
                answer: pendingReview.answer,
                questionType: pendingReview.questionType,
                cource: pendingReview.cource,
                subject: pendingReview.subject,
                company: pendingReview.company,
                companyType: pendingReview.companyType,
                location: pendingReview.location,
                writtenBy: pendingReview.submittedBy
            });

            await CourseModel.findOneAndUpdate(
                { course: pendingReview.cource },
                { $addToSet: { company: pendingReview.company } },
                { upsert: true, new: true }
            );

            await UserReviewPendingModel.deleteOne({ _id: pendingReview._id });

            await EmailService(
                pendingReview.submitterEmail,
                "Review Approved and Published",
                `<p>Dear ${pendingReview.submitterName},</p>
                 <p>Your submitted review has been verified by SuperAdmin and published successfully.</p>
                 <ul>
                   <li><strong>Course:</strong> ${pendingReview.cource}</li>
                   <li><strong>Subject:</strong> ${pendingReview.subject}</li>
                   <li><strong>Company:</strong> ${pendingReview.company}</li>
                 </ul>`
            );

            return res.status(200).json({
                success: true,
                message: "User review approved and moved to post bank",
                post
            });
        } catch (error) {
            console.error("approveUserReviewError:", error.message);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    static async rejectUserReview(req, res) {
        try {
            const { id } = req.params;
            const reason = (req.body?.reason || "").toString().trim();

            const rejectedReview = await UserReviewPendingModel.findOneAndUpdate(
                { _id: id, status: "pending" },
                { status: "rejected", rejectReason: reason },
                { new: true }
            );

            if (!rejectedReview) {
                return res.status(404).json({
                    success: false,
                    message: "Pending review not found"
                });
            }

            await EmailService(
                rejectedReview.submitterEmail,
                "Review Rejected by SuperAdmin",
                `<p>Dear ${rejectedReview.submitterName},</p>
                 <p>Your review submission was not approved by SuperAdmin.</p>
                 <ul>
                   <li><strong>Company:</strong> ${rejectedReview.company}</li>
                   <li><strong>Subject:</strong> ${rejectedReview.subject}</li>
                   <li><strong>Reason:</strong> ${reason || "Not specified"}</li>
                 </ul>
                 <p>You can submit a corrected review anytime.</p>`
            );

            return res.status(200).json({
                success: true,
                message: "User review rejected successfully"
            });
        } catch (error) {
            console.error("rejectUserReviewError:", error.message);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
     
}

module.exports = SuperadminController;

