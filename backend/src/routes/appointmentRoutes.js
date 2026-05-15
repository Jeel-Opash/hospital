import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { authorizeRole } from '../middleware/authroleMiddleware.js';
import { AllAppointmentsOfDoctor, bookAppoinment, cancelAppointment,
doctorUpdateAppointmentStatus, getAppointmentByDoctor, getAppointmentByPatient,
rescheduleAppointment, updateDoctorNotes } from '../controllers/appointmentController.js';

const router =express.Router();

router.get("/",authMiddleware,authorizeRole("Doctor"),AllAppointmentsOfDoctor,);
router.get("/patient",authMiddleware,authorizeRole("Patient"),getAppointmentByPatient);
router.get("/doctor",authMiddleware,authorizeRole("Doctor"),getAppointmentByDoctor,);
router.post("/book", authMiddleware, authorizeRole("Patient"), bookAppoinment);
router.put("/:id/cancel", authMiddleware, cancelAppointment);
router.post("/:id/reschedule", authMiddleware, rescheduleAppointment);
router.post("/:id/status-update",authMiddleware,authorizeRole("Doctor"),doctorUpdateAppointmentStatus);
router.post("/:id/update-doctor-notes",authMiddleware,authorizeRole("Doctor"),updateDoctorNotes);

export default router;