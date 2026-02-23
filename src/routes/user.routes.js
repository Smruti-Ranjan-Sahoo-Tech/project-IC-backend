const UserController = require('../controller/user.controller')
const verifyToken = require('../middleware/authMiddleware')
const authorization = require('../middleware/authorization')

const router=require('express').Router()


router.get('/getpostdata/:subject/:questionType',verifyToken, authorization("user"),UserController.getPostData)
router.get('/getSubjectName',verifyToken, authorization("user"),UserController.getSubjectName)

router.post('/add-review',verifyToken, authorization("user"),UserController.addReview)
router.get('/get-review',verifyToken, authorization("user"),UserController.getReview)
router.get('/get-all-user-reviews',verifyToken, authorization("user"),UserController.getAllUserReviews)

module.exports=router
