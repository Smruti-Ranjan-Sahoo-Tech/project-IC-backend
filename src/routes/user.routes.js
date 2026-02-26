const UserController = require('../controller/user.controller')
const verifyToken = require('../middleware/authMiddleware')
const authorization = require('../middleware/authorization')
const multer = require('multer')
const { pdfUpload, MAX_PDF_SIZE_BYTES } = require('../middleware/upload')

const router=require('express').Router()

const uploadPdfMiddleware = (req, res, next) => {
  pdfUpload.single('pdfFile')(req, res, (error) => {
    if (!error) {
      return next()
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: `PDF size must be ${Math.floor(MAX_PDF_SIZE_BYTES / (1024 * 1024))}MB or less` })
      }
      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, message: 'Only PDF files are allowed' })
      }
    }

    return res.status(400).json({ success: false, message: error.message || 'Failed to upload PDF' })
  })
}

router.get('/getpostdata/:subject/:questionType',verifyToken, authorization("user"),UserController.getPostData)
router.get('/getSubjectName',verifyToken, authorization("user"),UserController.getSubjectName)

router.post('/add-review',verifyToken, authorization("user"),UserController.addReview)
router.get('/get-review',verifyToken, authorization("user"),UserController.getReview)
router.get('/get-all-user-reviews',verifyToken, authorization("user"),UserController.getAllUserReviews)

router.post('/add-note',verifyToken, authorization("user"),uploadPdfMiddleware,UserController.addNoteRequest)
router.get('/get-note',verifyToken, authorization("user"),UserController.getNote)
router.get('/get-all-user-note',verifyToken, authorization("user"),UserController.getAllUserNotes)

module.exports=router
