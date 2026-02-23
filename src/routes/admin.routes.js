const AdminController = require('../controller/admin.controller')
const verifyToken = require('../middleware/authMiddleware')
const authorization = require('../middleware/authorization')

const router=require('express').Router()

// router.get('/',verifyToken,AdminController.createPost)
router.get('/getallpost',verifyToken,authorization("admin"),AdminController.seeAllPost)
router.post('/create-post',verifyToken,authorization("admin"),AdminController.createPost)
router.put('/update-post/:id',verifyToken,authorization("admin"),AdminController.updatePost)
router.delete('/delete-post/:id',verifyToken,authorization("admin"),AdminController.deletePost)
router.get('/getAllUser',verifyToken,authorization("admin"),AdminController.findAllUser)
router.put('/freezeUser/:id',verifyToken,authorization("admin"),AdminController.freezeUser)
router.put('/unfreezeUser/:id',verifyToken,authorization("admin"),AdminController.unfreezeUser)
router.get('/dashboard-data',verifyToken,authorization("admin"),AdminController.mainDashboard)

router.get('/getCourseSubjects',verifyToken,authorization("admin","user"),AdminController.getCourseSubjects)
router.post('/addCourceSubject',verifyToken,authorization("admin"),AdminController.addCourceSubject)
router.delete('/deleteCourceSubject/:id',verifyToken,authorization("admin"),AdminController.deleteCourceSubject)

router.get('/getCompaniesName',verifyToken,authorization("admin","user"),AdminController.getCompaniesName)
router.post('/addCompanyName',verifyToken,authorization("admin"),AdminController.addCompanyName)
router.delete('/deleteCompanyName/:id',verifyToken,authorization("admin"),AdminController.deleteCompanyName)

module.exports=router