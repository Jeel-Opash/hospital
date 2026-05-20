import mongoose from "mongoose";

const timeWindowSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: [true, "Start time is required"],
      match: [/^\d{2}:\d{2}$/, "Time must be in HH:MM format"],
    },
    end: {
      type: String,
      required: [true, "End time is required"],
      match: [/^\d{2}:\d{2}$/, "Time must be in HH:MM format"],
      validate: {
        validator: function (v) {
          return !this.start || v > this.start;
        },
        message: "End time must be after start time",
      },
    },
  },
  { _id: false },
);

const weeklyAvailabilitySchema = new mongoose.Schema(
  {
    Mon: { type: [timeWindowSchema], default: [] },
    Tue: { type: [timeWindowSchema], default: [] },
    Wed: { type: [timeWindowSchema], default: [] },
    Thu: { type: [timeWindowSchema], default: [] },
    Fri: { type: [timeWindowSchema], default: [] },
    Sat: { type: [timeWindowSchema], default: [] },
    Sun: { type: [timeWindowSchema], default: [] },
  },
  { _id: false },
);

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "UserId is required "],
      unique: true,
      index: true,
    },
    specialty: {
      type: String,
      required: [true, "specialty is required"],
      trim: true,
      index: true,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    location: {
      type: String,
      required: [true, "location is required"],
      trim: true,
      index: true,
    },
    slotDurationMin: {
      type: Number,
      required: [true, "Slot duration is required"],
      enum: {
        values: [15, 20, 30, 45, 60],
        message: "Slot duration must be 15, 20, 30, 45, or 60 minutes",
      },
      default: 30,
    },
    weeklyAvailability: {
      type: weeklyAvailabilitySchema,
      default: () => ({}),
    },
    blackoutDates: {
      type: [
        new mongoose.Schema(
          {
            date: {
              type: String,
              required: true,
              match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"],
            },
            startTime: {
              type: String,
              default: null,
              match: [/^\d{2}:\d{2}$/, "startTime must be HH:MM"],
            },
            endTime: {
              type: String,
              default: null,
              match: [/^\d{2}:\d{2}$/, "endTime must be HH:MM"],
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    maxPatientsPerSlot: {
      type: Number,
      default: 1,
      min: [1, "At least one patient must be allowed per slot"],
    },
    isAcceptingAppointments: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

doctorProfileSchema.index({ specialty: 1, location: 1 });

const doctorProfileModel = mongoose.model("DoctorProfile", doctorProfileSchema);

export default doctorProfileModel;