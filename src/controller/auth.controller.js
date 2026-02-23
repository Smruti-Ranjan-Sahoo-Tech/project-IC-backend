const AdminAcessRequestModel = require("../models/AdminAccessRequest.model.js.js");
const UserModel = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const generateToken = require("../utils/generateToken.js");
const EmailService = require("../config/email.config.js");

const isStrongPassword = (password = "") => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
};

const PASSWORD_RULE_MESSAGE =
    "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";

class AuthController {

    static async register(req, res) {
        try {
            const { username, email, password, role, phone, cource, passoutYear } = req.body;

            if (!username || !email  || !role || !phone || !cource) {
                return res.status(400).json({ message: "All fields are required" });
            }

            const user = await UserModel.findOne({ email });
            if (user) {
                return res.status(409).json({ message: "User already registered" });
            }

            if (role === "admin") {
                const adminReqExist = await AdminAcessRequestModel.findOne({ email });
                if (adminReqExist) {
                    return res.status(409).json({ message: "Admin request already exists" });
                }

                const newAdminRequest = await AdminAcessRequestModel.create({ username, email, role, phone, cource });

                // Professional email to super admin about new admin request
                await EmailService(  process.env.S_ADMIN_EMAIL, "New Admin Access Request Received",  
                    `<p>Dear SuperAdmin,</p>
                    <p>A new admin access request has been received from:</p>
                    <p><strong>Name:</strong> ${username}<br/>
                    <strong>Email:</strong> ${email}</p>
                    <p>Please review this request in your dashboard and take appropriate action.</p>
                    <p>Best regards,<br/>Project-IC System</p>`);

                // Professional email to requesting admin
                await EmailService(email,"Admin Application Under Review", 
                    `<p>Dear ${username},</p>
                    <p>Thank you for submitting your admin account request. Your application has been received and is currently under review by our SuperAdministrator.</p>
                    <p>We will notify you via email once your request has been processed. Please wait for our confirmation email which will contain your account setup instructions.</p>
                    <p>Best regards,<br/>Project-IC Team</p>`);

                return res.status(202).json({ message: "Your admin request is under review", newAdminRequest });
            }

            if (!passoutYear || !password) {
                return res.status(400).json({ message: "All field are required" });
            }

            if (!isStrongPassword(password)) {
                return res.status(400).json({ message: PASSWORD_RULE_MESSAGE });
            }

            const hashPassword = await bcrypt.hash(password, Number(process.env.SALT));

            // ADMIN
            if (role === "admin") {
                const adminReqExist = await AdminAcessRequestModel.findOne({ email });
                if (adminReqExist) {
                    return res.status(409).json({ message: "Admin request already exists" });
                }

                const newAdminRequest = await AdminAcessRequestModel.create({ username, email,  hashPassword, role, phone, cource });

                // Professional email to super admin about new admin request
                await EmailService(  process.env.S_ADMIN_EMAIL, "New Admin Access Request Received",  
                    `<p>Dear SuperAdmin,</p>
                    <p>A new admin access request has been received from:</p>
                    <p><strong>Name:</strong> ${username}<br/>
                    <strong>Email:</strong> ${email}</p>
                    <p>Please review this request in your dashboard and take appropriate action.</p>
                    <p>Best regards,<br/>Project-IC System</p>`);

                // Professional email to requesting admin
                await EmailService(email,"Admin Application Under Review", 
                    `<p>Dear ${username},</p>
                    <p>Thank you for submitting your admin account request. Your application has been received and is currently under review by our SuperAdministrator.</p>
                    <p>We will notify you via email once your request has been processed. Please wait for our confirmation email which will contain your account setup instructions.</p>
                    <p>Best regards,<br/>Project-IC Team</p>`);

                return res.status(202).json({ message: "Your admin request is under review", newAdminRequest });
            }

            // USER
            await UserModel.create({ username, email,  hashPassword, role, phone, cource, passoutYear });
            
            // professional email to user
            await EmailService( email, "Registration Successful",
                `<p>Dear ${username},</p>
                <p>Welcome to project-ic! Your account has been successfully created.</p>
                <p>You can now log in to your account using your email and password.</p>
                <p>If you have any questions or need assistance, please contact our support team.</p>
                <p>Best regards,<br/>Project-IC Team</p>`  );

            return res.status(201).json({ message: "User registered successfully" });

        } catch (error) {
            console.log("registerControllerError:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }


    static async login(req, res) {
        try {
            console.time('login')
            const { email, password } = req.body;
            
            const user = await UserModel.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: "Account not registered" });
            }
            if(user.isBlocked){
                return res.status(403).json({ message: "Your account is blocked. Please contact support." });
            }
            const isMatch = await bcrypt.compare(password, user.hashPassword);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid credentials" });
            }
            console.log("user",user)
            
            //i want send all userdata but nnot hashPassword
            const token = generateToken(user);
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            console.timeEnd('login')
            const userWithoutPassword = user.toObject();
            delete userWithoutPassword.hashPassword;
            return res.status(200).json({ message: "Login successful", role: user.role, user: userWithoutPassword });

        } catch (error) {
            console.log("LoginControllerError:",error.message)
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async logout(req, res) {
        try {
            res.clearCookie("token");
            return res.status(200).json({ message: "Logged out" });
        } catch (error) {
            console.log("logoutError:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ message: "Email is required" });
            const user = await UserModel.findOne({ email });
            if (!user) return res.status(404).json({ message: "No account with that email" });

            const token = jwt.sign({ id: user._id }, process.env.JWT_SERVER_SECREAT, { expiresIn: "1h" });
            console.log("forgotPaaword data:",process.env.CLIENT_URL)
            const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
            console.log(resetUrl)

             EmailService(email, "Password Reset", `<p>Hello ${user.username},</p><p>Click <a href=\"${resetUrl}\">here</a> to reset your password. The link expires in 1 hour.</p>`);

            return res.status(200).json({ message: "Password reset link sent to email" });
        } catch (error) {
            console.log("forgotPasswordError:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) return res.status(400).json({ message: "Token and new password required" });

            const decoded = jwt.verify(token, process.env.JWT_SERVER_SECREAT);
            const user = await UserModel.findById(decoded.id);
            if (!user) return res.status(404).json({ message: "User not found" });

            const hashPassword = await bcrypt.hash(newPassword, Number(process.env.SALT));
            user.hashPassword = hashPassword;
            await user.save();

            await EmailService(user.email, "Password Changed", `<p>Hello ${user.username},</p><p>Your password was changed successfully.</p>`);

            return res.status(200).json({ message: "Password updated successfully" });
        } catch (error) {
            console.log("resetPasswordError:", error.message);
            return res.status(500).json({ message: "Invalid or expired token" });
        }
    }

    static async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) return res.status(400).json({ message: "Old and new password required" });

            const user = await UserModel.findById(req.user.id);
            if (!user) return res.status(404).json({ message: "User not found" });

            const match = await bcrypt.compare(oldPassword, user.hashPassword);
            if (!match) return res.status(401).json({ message: "Old password is incorrect" });

            const hashPassword = await bcrypt.hash(newPassword, Number(process.env.SALT));
            user.hashPassword = hashPassword;
            await user.save();

            await EmailService(user.email, "Password Changed", `<p>Hello ${user.username},</p><p>Your password was changed successfully.</p>`);

            return res.status(200).json({ message: "Password changed" });
        } catch (error) {
            console.log("changePasswordError:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async updateProfile(req, res) {
        try {
            const updates = (({ username, phone, cource, passoutYear }) => ({ username, phone, cource, passoutYear }))(req.body);
            const user = await UserModel.findById(req.user.id);
            if (!user) return res.status(404).json({ message: "User not found" });

            Object.keys(updates).forEach((k) => {
                if (updates[k] !== undefined) user[k] = updates[k];
            });
            await user.save();

            await EmailService(user.email, "Profile Updated", `<p>Hello ${user.username},</p><p>Your profile was updated successfully.</p>`);

            return res.status(200).json({ message: "Profile updated", user });
        } catch (error) {
            console.log("updateProfileError:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async deleteProfile(req, res) {
        try {
            const user = await UserModel.findById(req.user.id);
            if (!user) return res.status(404).json({ message: "User not found" });

            await UserModel.findByIdAndDelete(req.user.id);
            res.clearCookie("token");

            await EmailService(user.email, "Account Deleted", `<p>Goodbye ${user.username},</p><p>Your account has been deleted.</p>`);

            return res.status(200).json({ message: "Account deleted" });
        } catch (error) {
            console.log("deleteProfileError:", error.message);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    static async status(req, res) {
        try {
            const token = req.cookies?.token;
            if (!token) return res.status(200).json({ isLogin: false });
            try {
                const decoded = jwt.verify(token, process.env.JWT_SERVER_SECREAT);
                // do not expose sensitive fields
                const user = await UserModel.findById(decoded.id).select('-hashPassword');
                if (!user) return res.status(200).json({ isLogin: false });
                return res.status(200).json({ isLogin: true, role: decoded.role || user.role, user });
            } catch (err) {
                return res.status(200).json({ isLogin: false });
            }
        } catch (error) {
            console.log('statusError:', error.message);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = AuthController;

