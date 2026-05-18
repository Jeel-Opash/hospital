import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import apiRoutes from "./routes/index.js";
import errorHandler from "./middleware/errorMiddleware.js";
import { responseMiddleware } from "./middleware/responseMiddleware.js";

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan("dev"));
app.use(responseMiddleware);

app.use("/api", apiRoutes);

app.use(errorHandler);

export default app;
