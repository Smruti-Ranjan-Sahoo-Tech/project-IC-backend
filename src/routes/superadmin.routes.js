const express=require('express')
const SuperadminController = require('../controller/superadmin.controller')
const jwt = require('jsonwebtoken');
const router=express.Router()

const requireSuperadmin = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.redirect('/superadmin/login');
    }

    const decoded = jwt.verify(token, process.env.JWT_SERVER_SECREAT);
    if (!decoded || decoded.role !== 'superadmin') {
      return res.redirect('/superadmin/login');
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.redirect('/superadmin/login');
  }
};

router.get("/login", (req, res) => {
  res.render("superadmin/login", { error: null });
});

router.post("/login", SuperadminController.superAdminLogin);

// Protected routes
router.get("/dashboard", requireSuperadmin, SuperadminController.dashboardPage);

router.get("/admin-requests", requireSuperadmin, SuperadminController.getAllAdminRequestUser);

router.post('/acceptAllAdminRequest', requireSuperadmin, SuperadminController.AcceptAllAdminRequest);

router.delete('/deleteAllAdminRequest', requireSuperadmin, SuperadminController.DeleteAllAdminRequest);

router.post('/acceptAdminRequest/:id', requireSuperadmin, SuperadminController.AcceptAdminRequest);

router.delete('/deleteAdminRequest/:id', requireSuperadmin, SuperadminController.DeleteAdminRequest);
router.get('/getAllAdminDetails', requireSuperadmin, SuperadminController.getAllAdminDetails);
router.delete('/adminDelete/:id', requireSuperadmin, SuperadminController.adminDelete);

router.post('/freezeAdmin/:id', requireSuperadmin, SuperadminController.freezeAdmin);
router.post('/unfreezeAdmin/:id', requireSuperadmin, SuperadminController.unfreezeAdmin);

router.get('/pending-course-subjects', requireSuperadmin, SuperadminController.pendingCourseSubjectsPage);
router.get('/getPendingCourseSubjects', requireSuperadmin, SuperadminController.getPendingCourseSubjects);
router.patch('/approveCourseSubject/:courseId/:subjectId', requireSuperadmin, SuperadminController.approveCourseSubject);
router.delete('/rejectCourseSubject/:courseId/:subjectId', requireSuperadmin, SuperadminController.rejectCourseSubject);

router.get('/pending-user-reviews', requireSuperadmin, SuperadminController.pendingUserReviewsPage);
router.get('/getPendingUserReviews', requireSuperadmin, SuperadminController.getPendingUserReviews);
router.patch('/approveUserReview/:id', requireSuperadmin, SuperadminController.approveUserReview);
router.delete('/rejectUserReview/:id', requireSuperadmin, SuperadminController.rejectUserReview);

router.get('/pending-user-notes', requireSuperadmin, SuperadminController.pendingUserNotesPage);
router.get('/getPendingUserNotes', requireSuperadmin, SuperadminController.getPendingUserNotes);
router.patch('/approveUserNote/:id', requireSuperadmin, SuperadminController.approveUserNote);
router.delete('/rejectUserNote/:id', requireSuperadmin, SuperadminController.rejectUserNote);
router.get('/users', requireSuperadmin, SuperadminController.usersPage);
router.post('/freezeUser/:id', requireSuperadmin, SuperadminController.freezeUser);
router.post('/unfreezeUser/:id', requireSuperadmin, SuperadminController.unfreezeUser);
router.get('/enquiries', requireSuperadmin, SuperadminController.enquiriesPage);

router.get('/logout', requireSuperadmin, SuperadminController.logout);

// If wrong /superadmin route is requested, always go back to login
router.use((req, res) => {
  return res.redirect('/superadmin/login');
});

module.exports=router
