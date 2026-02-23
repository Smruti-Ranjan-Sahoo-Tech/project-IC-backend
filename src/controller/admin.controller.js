const CourseModel = require("../models/course.model");
const PostModel = require("../models/post.model");
const UserModel = require("../models/user.model");
const EmailService = require("../config/email.config.js");


class AdminController {
    static async seeAllPost(req, res) {
        try {

            const { email, username, _id, cource } = req.user;
            console.log(req.user)

            const posts = await PostModel.find({ cource }).populate("writtenBy", "username email");

            return res.status(200).json({
                success: true,
                admin: { email, username, _id },
                posts
            });
        } catch (error) {
            console.error("seeAllPost:", error.message);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }

    static async createPost(req, res) {
        try {
            const { id, cource } = req.user;
            const { question, answer, questionType, subject, company, companyType, location } = req.body;
            console.log("Creating post - req.body:", req.body)
            console.log("Creating post - req.user:", req.user)

            if (!["Interview", "Coding", "Subjective"].includes(questionType)) {
                return res.status(400).json({ success: false, message: "Invalid question type" });
            }

            if (!["MNC", "Startup", "Other"].includes(companyType)) {
                return res.status(400).json({ success: false, message: "Invalid company type" });
            }

            const normalizedCompany = (company || "").toString().trim();
            const normalizedLocation = (location || "").toString().trim();

            if (!normalizedCompany) {
                return res.status(400).json({ success: false, message: "Company is required" });
            }

            if (!normalizedLocation) {
                return res.status(400).json({ success: false, message: "Location is required" });
            }

            const newPost = await PostModel.create({
                question,
                answer,
                questionType,
                cource,
                subject,
                company: normalizedCompany,
                companyType,
                location: normalizedLocation,
                writtenBy: id
            });

            await CourseModel.findOneAndUpdate(
                { course: cource },
                { $addToSet: { company: normalizedCompany } },
                { new: true, upsert: true }
            );

            return res.status(201).json({
                success: true,
                message: "Post created successfully",
                post: newPost
            });
        } catch (error) {
            console.error("createPost:", error.message);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }


    static async updatePost(req, res) {
        try {
            const { id } = req.params;
            const { cource } = req.user
            const { question, answer, questionType, subject, company, companyType, location } = req.body;

            const updatePayload = { question, answer, questionType, cource, subject };

            if (companyType !== undefined) {
                if (!["MNC", "Startup", "Other"].includes(companyType)) {
                    return res.status(400).json({ success: false, message: "Invalid company type" });
                }
                updatePayload.companyType = companyType;
            }

            if (company !== undefined) {
                const normalizedCompany = company.toString().trim();
                if (!normalizedCompany) {
                    return res.status(400).json({ success: false, message: "Company is required" });
                }
                updatePayload.company = normalizedCompany;
            }

            if (location !== undefined) {
                const normalizedLocation = location.toString().trim();
                if (!normalizedLocation) {
                    return res.status(400).json({ success: false, message: "Location is required" });
                }
                updatePayload.location = normalizedLocation;
            }

            const updatedPost = await PostModel.findOneAndUpdate(
                { _id: id, cource },
                updatePayload,
                { new: true, runValidators: true }
            );

            if (!updatedPost) {
                return res.status(404).json({ success: false, message: "Post not found" });
            }

            if (updatePayload.company) {
                await CourseModel.findOneAndUpdate(
                    { course: cource },
                    { $addToSet: { company: updatePayload.company } },
                    { new: true, upsert: true }
                );
            }

            return res.status(200).json({ success: true, message: "Post updated successfully", post: updatedPost });
        } catch (error) {
            console.error("updatePost:", error.message);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
    static async deletePost(req, res) {
        try {
            const { id } = req.params;

            const deletedPost = await PostModel.findOneAndDelete({ _id: id, cource: req.user.cource });

            if (!deletedPost) {
                return res.status(404).json({ success: false, message: "Post not found" });
            }

            return res.status(200).json({ success: true, message: "Post deleted successfully" });
        } catch (error) {
            console.error("deletePost:", error.message);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
    static async findAllUser(req, res) {
        try {
            const cource = req.user.cource;
            const allUser = await UserModel
                .find({
                    cource: cource,
                    role: "user"
                })
                .select("-password");
            res.status(200).json({
                message: "All user data find sucessfully ",
                data: allUser
            }
            )

        } catch (error) {
            console.error("findAllUserError:", error.message);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
    static async freezeUser(req, res) {
        try {
            const { id } = req.params;

            const user = await UserModel.findByIdAndUpdate(
                id,
                { isBlocked: true },
                { new: true }
            );

            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }

            return res.status(200).json({
                message: "User Blocked Successfully"
            });

        } catch (error) {
            console.error("freezeUserError:", error.message);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    static async unfreezeUser(req, res) {
        try {
            const { id } = req.params;
            const user = await UserModel.findByIdAndUpdate(
                id,
                { isBlocked: false },
                { new: true }
            )
            if (!user) {
                return res.status(404).json({
                    message: "User not found"
                });
            }
            return res.status(200).json({
                message: "User Unblocked Successfully"
            });

        } catch (error) {
            console.error("unfreezeUserError:", error.message);
            return res.status(500).json({ success: false, message: "Internal server error" });
        }
    }
    static async mainDashboard(req, res) {
        try {
            const { cource } = req.user;

            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            const [
                totalUsers,
                totalCourceUsers,
                activeUsers,
                inactiveUsers,
                lastMonthRegistrations
            ] = await Promise.all([
                UserModel.countDocuments(),
                UserModel.countDocuments({ cource: cource }),
                UserModel.countDocuments({ isBlocked: false, cource: cource }),
                UserModel.countDocuments({ isBlocked: true, cource: cource }),
                UserModel.countDocuments({ createdAt: { $gte: oneMonthAgo }, cource: cource })
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    totalUsers,
                    totalCourceUsers,
                    activeUsers,
                    inactiveUsers,
                    lastMonthRegistrations
                }
            });

        } catch (error) {
            console.error("mainDashboardError:", error.message);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
    static async getCourseSubjects(req, res) {
        try {


            const requestedCourse = (req.user?.cource || '').toString().trim();
            const requesterRole = (req.user?.role || '').toString().trim().toLowerCase();

            // validation
            if (!requestedCourse) {
                return res.status(400).json({
                    success: false,
                    message: "Course is required",
                    subjects: []
                });
            }

            // find subjects only
            const courseData = await CourseModel.findOne(
                { course: requestedCourse },
                { subjects: 1, _id: 0 }
            ).lean(); // improves performance

            // if course not found, return empty subjects instead of error
            if (!courseData) {
                return res.status(200).json({
                    success: true,
                    subjects: []
                });
            }

            let subjects = Array.isArray(courseData.subjects) ? courseData.subjects : [];

            // users should see only approved subjects
            if (requesterRole === "user") {
                subjects = subjects.filter((item) => item?.status === "approve");
            }

            return res.status(200).json({
                success: true,
                subjects
            });

        } catch (error) {
            console.error("getCourseSubjectsError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
                subjects: []
            });
        }
    }
    


    static async addCourceSubject(req, res) {
        try {
            const { id, cource, email, username } = req.user;
            const { subject } = req.body;
            const normalizedCourse = (cource || "").toString().trim();
            const normalizedSubject = (subject || "").toString().trim();

            // validation
            if (!normalizedSubject) {
                return res.status(400).json({
                    success: false,
                    message: "Subject is required"
                });
            }

            if (!normalizedCourse) {
                return res.status(400).json({
                    success: false,
                    message: "Course is required"
                });
            }

            let courseData = await CourseModel.findOne({ course: normalizedCourse });

            if (!courseData) {
                courseData = await CourseModel.create({
                    course: normalizedCourse,
                    subjects: [{ name: normalizedSubject, status: "pending" }]
                });
            } else {
                const existingSubject = courseData.subjects.find(
                    (item) =>
                        item?.name &&
                        item.name.toString().trim().toLowerCase() === normalizedSubject.toLowerCase()
                );

                if (existingSubject) {
                    if (existingSubject.status === "pending") {
                        return res.status(409).json({
                            success: false,
                            message: "Subject request is already pending superadmin approval"
                        });
                    }

                    if (existingSubject.status === "approve") {
                        return res.status(409).json({
                            success: false,
                            message: "Subject is already approved for this course"
                        });
                    }

                    if (existingSubject.status === "delete_pending") {
                        return res.status(409).json({
                            success: false,
                            message: "Subject delete request is pending superadmin approval"
                        });
                    }

                    if (existingSubject.status === "rejected") {
                        existingSubject.status = "pending";
                        existingSubject.requesterAdminId = id;
                        existingSubject.requesterAdminName = username || "";
                        existingSubject.requesterAdminEmail = email || "";
                        await courseData.save();

                        const superAdminEmail = process.env.S_ADMIN_EMAIL;
                        const adminRequestMessage = `
                        <h2>New Course Subject Request</h2>
                        <p>An admin has requested to add a new subject to a course.</p>
                        <ul>
                            <li><strong>Admin Name:</strong> ${username}</li>
                            <li><strong>Admin Email:</strong> ${email}</li>
                            <li><strong>Course:</strong> ${cource}</li>
                            <li><strong>Subject:</strong> ${normalizedSubject}</li>
                            <li><strong>Status:</strong> Pending Approval</li>
                        </ul>
                        `;

                        EmailService(
                            superAdminEmail,
                            "Admin Course Subject Request",
                            adminRequestMessage
                        );

                        const adminMessage = `
                        <h2>Course Subject Request Submitted</h2>
                        <p>Your request has been submitted successfully.</p>
                        <ul>
                            <li><strong>Course:</strong> ${cource}</li>
                            <li><strong>Subject:</strong> ${normalizedSubject}</li>
                            <li><strong>Status:</strong> Under Review</li>
                        </ul>
                        `;

                        EmailService(
                            email,
                            "Course Subject Verification Under Process",
                            adminMessage
                        );

                        return res.status(200).json({
                            success: true,
                            message: "Subject request resubmitted for superadmin approval",
                            data: courseData
                        });
                    }

                    return res.status(409).json({
                        success: false,
                        message: "Subject already exists"
                    });
                }

                courseData.subjects.push({
                    name: normalizedSubject,
                    status: "pending",
                    requesterAdminId: id,
                    requesterAdminName: username || "",
                    requesterAdminEmail: email || ""
                });

                await courseData.save();
            }

            // Send email to SuperAdmin
            const superAdminEmail = process.env.S_ADMIN_EMAIL;

            const adminRequestMessage = `
            <h2>New Course Subject Request</h2>
            <p>An admin has requested to add a new subject to a course.</p>
            <ul>
                <li><strong>Admin Name:</strong> ${username}</li>
                <li><strong>Admin Email:</strong> ${email}</li>
                <li><strong>Course:</strong> ${cource}</li>
                <li><strong>Subject:</strong> ${normalizedSubject}</li>
                <li><strong>Status:</strong> Pending Approval</li>
            </ul>
        `;

             EmailService(
                superAdminEmail,
                "Admin Course Subject Request",
                adminRequestMessage
            );

            // Send email to Admin
            const adminMessage = `
            <h2>Course Subject Request Submitted</h2>
            <p>Your request has been submitted successfully.</p>
            <ul>
                <li><strong>Course:</strong> ${cource}</li>
                <li><strong>Subject:</strong> ${normalizedSubject}</li>
                <li><strong>Status:</strong> Under Review</li>
            </ul>
        `;

             EmailService(
                email,
                "Course Subject Verification Under Process",
                adminMessage
            );

            return res.status(200).json({
                success: true,
                message: "Subject added with pending status and notification emails sent",
                data: courseData
            });

        } catch (error) {
            console.error("addCourceSubjectError:", error);

            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    static async deleteCourceSubject(req, res) {
        try {
            const { cource, email, username } = req.user;
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Subject is required"
                });
            }

            const normalizedSubject = id.toString().trim().toLowerCase();
            const courseData = await CourseModel.findOne({ course: cource });
            if (!courseData) {
                return res.status(404).json({
                    success: false,
                    message: "Course not found"
                });
            }

            const subjectItem = courseData.subjects.find(
                (item) => item?.name?.toString().trim().toLowerCase() === normalizedSubject
            );

            if (!subjectItem) {
                return res.status(404).json({
                    success: false,
                    message: "Subject not found"
                });
            }

            if (subjectItem.status === "delete_pending") {
                return res.status(409).json({
                    success: false,
                    message: "Delete request already pending superadmin approval"
                });
            }

            subjectItem.status = "delete_pending";
            subjectItem.requesterAdminId = id;
            subjectItem.requesterAdminName = username || "";
            subjectItem.requesterAdminEmail = email || "";
            await courseData.save();

            const superAdminEmail = process.env.S_ADMIN_EMAIL;
            const subjectName = subjectItem.name;

            EmailService(
                superAdminEmail,
                "Course Subject Delete Request",
                `<h2>Course Subject Delete Request</h2>
                 <p>An admin requested subject deletion.</p>
                 <ul>
                    <li><strong>Admin Name:</strong> ${username}</li>
                    <li><strong>Admin Email:</strong> ${email}</li>
                    <li><strong>Course:</strong> ${cource}</li>
                    <li><strong>Subject:</strong> ${subjectName}</li>
                    <li><strong>Status:</strong> Delete Pending Approval</li>
                 </ul>`
            );

            EmailService(
                email,
                "Subject Delete Request Submitted",
                `<h2>Delete Request Submitted</h2>
                 <p>Your request to delete a subject has been submitted to SuperAdmin.</p>
                 <ul>
                    <li><strong>Course:</strong> ${cource}</li>
                    <li><strong>Subject:</strong> ${subjectName}</li>
                    <li><strong>Status:</strong> Under Review</li>
                 </ul>`
            );

            return res.status(200).json({
                success: true,
                message: "Delete request submitted to superadmin",
                course: courseData
            });

        } catch (error) {
            console.error("deleteCourceSubjectError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
    static async getCompaniesName(req, res) {
        try {
            const requestedCourse = (req.user?.cource || '').toString().trim();
            const requestedCompanyType = (req.query?.companyType || '').toString().trim();
            const requestedCompany = (req.query?.company || '').toString().trim();
            const allowedCompanyTypes = ["MNC", "Startup", "Other"];

            if (!requestedCourse) {
                return res.status(400).json({
                    success: false,
                    message: "Course is required",
                    companies: []
                });
            }

            if (requestedCompanyType && !allowedCompanyTypes.includes(requestedCompanyType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid company type",
                    companies: []
                });
            }

            const [courseData, postCompanies] = await Promise.all([
                CourseModel.findOne(
                    { course: requestedCourse },
                    { company: 1, _id: 0 }
                ).lean(),
                PostModel.distinct("company", {
                    cource: requestedCourse,
                    company: { $exists: true, $ne: "" }
                })
            ]);

            const mergedCompanies = Array.from(
                new Set([...(courseData?.company || []), ...(postCompanies || [])])
            );

            if (!requestedCompanyType) {
                let locations = [];
                if (requestedCompany) {
                    locations = await PostModel.distinct("location", {
                        cource: requestedCourse,
                        company: requestedCompany,
                        location: { $exists: true, $ne: "" }
                    });
                }
                return res.status(200).json({
                    success: true,
                    companies: mergedCompanies,
                    locations: locations || []
                });
            }

            const filteredByType = await PostModel.distinct("company", {
                cource: requestedCourse,
                companyType: requestedCompanyType,
                company: { $exists: true, $ne: "" }
            });

            const filteredSet = new Set((filteredByType || []).map((item) => item.toString().trim().toLowerCase()));
            const filteredCompanies = mergedCompanies.filter((item) =>
                filteredSet.has(item.toString().trim().toLowerCase())
            );

            let locations = [];
            if (requestedCompany) {
                locations = await PostModel.distinct("location", {
                    cource: requestedCourse,
                    companyType: requestedCompanyType,
                    company: requestedCompany,
                    location: { $exists: true, $ne: "" }
                });
            }

            return res.status(200).json({
                success: true,
                companies: filteredCompanies,
                locations: locations || []
            });

        } catch (error) {
            console.error("getCompaniesNameError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
                companies: []
            });
        }
    }
    static async addCompanyName(req, res) {
        try {
            const { cource } = req.user; 
            const { company } = req.body;

            // validation
            if (!company || company.trim() === "") {
                return res.status(400).json({
                    success: false,
                    message: "Company is required"
                });
            }

            // update or create course
            const courseData = await CourseModel.findOneAndUpdate(
                { course: cource.trim() },
                { $addToSet: { company: company.trim() } },
                {
                    new: true,
                    upsert: true
                }
            );

            return res.status(200).json({
                success: true,
                message: "Company added to course successfully",
                course: courseData
            });

        } catch (error) {
            console.error("addCompanyNameError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
    static async deleteCompanyName(req, res) {
        try {
            const { cource } = req.user;
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: "Company is required"
                });
            }

            const updatedCourse = await CourseModel.findOneAndUpdate(
                { course: cource },
                { $pull: { company: id.trim() } },
                { new: true }
            );

            if (!updatedCourse) {
                return res.status(404).json({
                    success: false,
                    message: "Course not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Company removed successfully",
                course: updatedCourse
            });

        } catch (error) {
            console.error("deleteCompanyNameError:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }


}
module.exports = AdminController
