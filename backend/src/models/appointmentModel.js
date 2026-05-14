import mongoose from "mongoose";
import { DateTime } from "luxon";
import {IST,formatDateIST,formatTimeIST,formatDateTimeIST,toIST,} from "../utils/dateUtils.js";

const appointmentSchema = new mongoose.Schema(
  {    bookingId: {
      type: String,
      unique: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorProfile",
      required: [true, "DoctorId is required"],
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "PatientId is required"],
    },
    slotStartUTC: {
      type: Date,
      required: [true, "Slot start time is required"],
    },
    slotEndUTC: {
      type: Date,
      required: [true, "Slot end time is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW", "COMPLETED"],
        message: "Invalid appointment status",
      },
      default: "PENDING",
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      maxlength: [500, "Reason  500 characters"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Notes  2000 characters"],
    },
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    doctorNotes: {
      type: String,
      trim: true,
      maxlength: [200, "Doctor  200 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

appointmentSchema.pre("validate", async function () {
  if (!this.bookingId) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.bookingId = `APT-${ts}-${rand}`;
  }
});

appointmentSchema.pre("validate", async function () {
  if (this.slotStartUTC && this.slotEndUTC) {
    if (this.slotEndUTC <= this.slotStartUTC) {
      throw new Error("slotEndUTC must be after slotStartUTC");
    }
  }
});

appointmentSchema.methods.isCancellable = function (minHoursBefore = 4) {
  const now = DateTime.utc();
  const slotStart = DateTime.fromJSDate(this.slotStartUTC, { zone: "utc" });
  const hoursUntilSlot = slotStart.diff(now, "hours").hours;
  return (
    hoursUntilSlot >= minHoursBefore &&
    (this.status === "CONFIRMED" || this.status === "PENDING")
  );
};

appointmentSchema.methods.toLocalTime = function (ianaTimezone = IST) {
  const tz = ianaTimezone || IST;
  const start = DateTime.fromJSDate(this.slotStartUTC, { zone: "utc" }).setZone(
    tz,
  );
  const end = DateTime.fromJSDate(this.slotEndUTC, { zone: "utc" }).setZone(tz);
  return {
    start: start.toISO(),
    end: end.toISO(),
    displayStart: start.toFormat("ccc, MMM d, yyyy, hh:mm a ZZZZ"),
    displayEnd: end.toFormat("hh:mm a"),
  };
};

const appointmentModel = mongoose.model("Appointment", appointmentSchema);

export default appointmentModel;