import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizeRole } from "../middleware/authroleMiddleware.js";
import {joinWaitlist,getMyWaitlist,leaveWaitlist,getSlotQueue,
  processNextInQueue,} from "../controllers/waitlistController.js";
const router = express.Router();

router.post("/join", authMiddleware, authorizeRole("Patient"), joinWaitlist);
router.get("/my", authMiddleware, authorizeRole("Patient"), getMyWaitlist);
router.get("/slot", authMiddleware, authorizeRole("Doctor"), getSlotQueue);
router.post("/process-next", processNextInQueue);
router.delete("/:waitlistId",authMiddleware,authorizeRole("Patient"),leaveWaitlist,);

export default router;
