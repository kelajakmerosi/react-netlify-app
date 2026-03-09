import { Router } from 'express';
import authRoutes from './auth.routes';
import subjectRoutes from './subject.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import teacherRoutes from './teacher.routes';
import examRoutes from './exam.routes';
import materialRoutes from './material.routes';
import paymentRoutes from './payment.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/subjects', subjectRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/teacher', teacherRoutes);
router.use('/exams', examRoutes);
router.use('/material-packs', materialRoutes);
router.use('/payments', paymentRoutes);

export default router;
