import mongoose from "mongoose";
import { DateTime } from "luxon";

const waitlistSchema = new mongoose.Schema(
  {
    waitlistId: {
      type: String,
      unique: true,
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorProfile",
      required: [true, "DoctorId is required"],
      index: true,
    },
    slotStartUTC: {
      type: Date,
      required: [true, "Slot start time (UTC) is required"],
      index: true,
    },
    slotEndUTC: {
      type: Date,
      required: [true, "Slot end time (UTC) is required"],
    },

    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "PatientId is required"],
    },

    position: {
      type: Number,
      required: [true, "Queue position is required"],
      min: [1, "Position must be at least 1"],
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot  500 characters"],
    },

    status: {
      type: String,
      enum: {
        values: ["WAITING", "NOTIFIED", "BOOKED", "EXPIRED", "SKIPPED"],
        message: "Invalid waitlist status: {VALUE}",
      },
      default: "WAITING",
      index: true,
    },

    notifyWindowMin: {
      type: Number,
      default: 30,
      min: [5, "Notification window must be at least 5 minutes"],
      max: [120, "Notification window cannot  120 minutes"],
    },
    notifiedAt: {
      type: Date,
      default: null,
    },

    autoBookedAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    bookedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

waitlistSchema.index(
  { doctorId: 1, slotStartUTC: 1, patientId: 1 },
  { unique: true, name: "unique_waitlist_entry" },
);

waitlistSchema.index(
  { doctorId: 1, slotStartUTC: 1, status: 1, position: 1 },
  { name: "waitlist_queue_lookup" },
);

waitlistSchema.pre("validate", function () {
  if (!this.waitlistId) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.waitlistId = `WL-${ts}-${rand}`;
  }
});

waitlistSchema.pre("validate", function () {
  if (!this.expiresAt && this.slotStartUTC) {
    this.expiresAt = this.slotStartUTC;
  }
});

waitlistSchema.pre("validate", function () {
  if (this.slotStartUTC && this.slotEndUTC) {
    if (this.slotEndUTC <= this.slotStartUTC) {
      throw new Error("slotEndUTC must be after slotStartUTC");
    }
  }
});

waitlistSchema.methods.isActive = function () {
  if (this.status === "WAITING") return true;
  if (this.status === "NOTIFIED" && this.notifiedAt) {
    const deadline = DateTime.fromJSDate(this.notifiedAt, { zone: "utc" }).plus(
      { minutes: this.notifyWindowMin },
    );
    return DateTime.utc() < deadline;
  }
  return false;
};

waitlistSchema.methods.toLocalSlot = function (ianaTimezone = "Asia/Kolkata") {
  const tz = ianaTimezone || "Asia/Kolkata";
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

const waitlistModel = mongoose.model("Waitlist", waitlistSchema);

export default waitlistModel;