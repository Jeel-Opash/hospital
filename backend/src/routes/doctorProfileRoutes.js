import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizeRole } from "../middleware/authroleMiddleware.js";
import {
  createDoctorProfile,
  defineWeeklyAvailability,
  getMyProfile,
  updateDoctorProfile,
  updateBlackoutDates,
  searchDoctor,
} from "../controllers/doctorProfileController.js";
const router = express.Router();

router.get("/search", searchDoctor);
router.get("/", authMiddleware, authorizeRole("Doctor"), getMyProfile);

router.post(
  "/weekly-availability",
  authMiddleware,
  authorizeRole("Doctor"),
  defineWeeklyAvailability,
);

router.post(
  "/blackout-dates",
  authMiddleware,
  authorizeRole("Doctor"),
  updateBlackoutDates,
);

router.post(
  "/create",
  authMiddleware,
  authorizeRole("Doctor"),
  createDoctorProfile,
);

router.patch(
  "/update",
  authMiddleware,
  authorizeRole("Doctor"),
  updateDoctorProfile,
);

export default router;
