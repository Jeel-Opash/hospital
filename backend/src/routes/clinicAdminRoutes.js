import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authorizeRole } from '../middleware/authroleMiddleware.js';
import { appointmentPerDoctors } from '../controllers/clinicAdminController.js';

const router =express.Router();

router.get("/",authMiddleware,authorizeRole("Clinic Admin"),appointmentPerDoctors);

export default router;