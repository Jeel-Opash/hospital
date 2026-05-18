import express from "express";

import appointmentRouter from "./appointmentRoutes.js";
import authRoutes from "./authRoutes.js";
import clinicAdminRouter from "./clinicAdminRoutes.js";
import doctorProfileRouter from "./doctorProfileRoutes.js";
import waitlistRouter from "./waitlistRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/doctor", doctorProfileRouter);
router.use("/appointment", appointmentRouter);
router.use("/clinic-admin", clinicAdminRouter);
router.use("/waitlist", waitlistRouter);

export default router;
