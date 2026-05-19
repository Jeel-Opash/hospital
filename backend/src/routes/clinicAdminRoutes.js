import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizeRole } from "../middleware/authroleMiddleware.js";
import {
  appointmentPerDoctors,
  deleteDoctor,
  deletePatient,
  emergencyAddDoctor,
  emergencyAddPatient,
  getClinicStats,
  getAllDoctors,
  getAllPatients,
  getAllAppointments,
  adminUpdateAppointmentStatus,
  toggleDoctorAcceptance,
  updateDoctorByAdmin,
} from "../controllers/clinicAdminController.js";

const router = express.Router();
const adminOnly = [authMiddleware, authorizeRole("Clinic Admin")];

router.get("/stats", ...adminOnly, getClinicStats);
router.get("/doctors", ...adminOnly, getAllDoctors);
router.get("/patients", ...adminOnly, getAllPatients);
router.post("/emergency/doctor", ...adminOnly, emergencyAddDoctor);
router.post("/emergency/patient", ...adminOnly, emergencyAddPatient);
router.patch("/doctors/:id", ...adminOnly, updateDoctorByAdmin);
router.delete("/doctors/:id", ...adminOnly, deleteDoctor);
router.delete("/patients/:id", ...adminOnly, deletePatient);
router.get("/appointments", ...adminOnly, getAllAppointments);
router.get("/appointments-per-doctor", ...adminOnly, appointmentPerDoctors);
router.patch("/appointments/:id/status", ...adminOnly, adminUpdateAppointmentStatus);
router.patch("/doctors/:id/toggle-acceptance", ...adminOnly, toggleDoctorAcceptance);

export default router;
