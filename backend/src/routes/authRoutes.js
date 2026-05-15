import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getMe,
  login,
  logout,
  register,
} from "../controllers/authController.js";
const router = express.Router();

router.get("/", authMiddleware, getMe);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);

export default router;
