const { Router } = require('express');
const authRoutes    = require('./auth.routes');
const subjectRoutes = require('./subject.routes');
const userRoutes    = require('./user.routes');
const adminRoutes   = require('./admin.routes');
const teacherRoutes = require('./teacher.routes');
const examRoutes = require('./exam.routes');
const materialRoutes = require('./material.routes');
const paymentRoutes = require('./payment.routes');

const router = Router();

router.use('/auth',     authRoutes);
router.use('/subjects', subjectRoutes);
router.use('/users',    userRoutes);
router.use('/admin',    adminRoutes);
router.use('/teacher', teacherRoutes);
router.use('/exams', examRoutes);
router.use('/material-packs', materialRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;
