const express=require('express')
const AuthController = require('../controller/auth.controller')
const verifyToken = require('../middleware/authMiddleware')
const router=express.Router()

router.post("/register",AuthController.register)
router.post("/login",AuthController.login)
router.post("/logout", verifyToken, AuthController.logout)

// password reset flow
router.post("/forgot-password", AuthController.forgotPassword)
router.post("/reset-password", AuthController.resetPassword)

// protected actions
router.post("/change-password", verifyToken, AuthController.changePassword)
router.put("/update-profile", verifyToken, AuthController.updateProfile)
router.delete("/delete-profile", verifyToken, AuthController.deleteProfile)

// public status check (reads cookie token)
router.get('/status', AuthController.status)

module.exports=router