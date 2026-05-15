import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import doctorProfileRouter from "./routes/doctorProfileRoutes.js";
import appointmentRouter from "./routes/appointmentRoutes.js";
import clinicAdminRouter from "./routes/clinicAdminRoutes.js";
import waitlistRouter from "./routes/waitlistRoutes.js";
import errorHandler from "./middleware/errorMiddleware.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorProfileRouter);
app.use("/api/appointment", appointmentRouter);
app.use("/api/clinic-admin", clinicAdminRouter);
app.use("/api/waitlist", waitlistRouter);


app.use(errorHandler);

export default app;
