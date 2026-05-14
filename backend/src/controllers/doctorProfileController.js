import doctorProfileModel from "../models/doctorProfileModel.js";
import appointmentModel from "../models/appointmentModel.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { DateTime } from "luxon";
import { IST } from "../utils/dateUtils.js";

export const createDoctorProfile = asyncHandler(async (req, res) => {
  const {
    specialty,
    qualifications,
    experienceYears,
    consultationFee,
    location,
    slotDurationMin,
    maxPatientsPerSlot,
    isAcceptingAppointments,
    timezone,
  } = req.body;

  if (!specialty || !location || !slotDurationMin) {
    throw new ApiError(
      400,
      "Specialty, location, and slot duration are required",
    );
  }

  const existingProfile = await doctorProfileModel.findOne({
    userId: req.user?._id,
  });
  if (existingProfile) {
    throw new ApiError(409, "Doctor profile already exists for this user");
  }

  const doctorProfile = await doctorProfileModel.create({
    userId: req.user?._id,
    specialty,
    qualifications,
    experienceYears,
    consultationFee,
    location,
    slotDurationMin,
    maxPatientsPerSlot,
    isAcceptingAppointments,
    timezone: timezone || IST,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        doctorProfile,
        "Doctor profile created successfully",
      ),
    );
});

export const updateDoctorProfile = asyncHandler(async (req, res) => {
  const {
    specialty,
    qualifications,
    experienceYears,
    consultationFee,
    location,
    slotDurationMin,
    maxPatientsPerSlot,
    isAcceptingAppointments,
    timezone,
  } = req.body;

  const doctorProfile = await doctorProfileModel.findOneAndUpdate(
    { userId: req.user?._id },
    {
      $set: {
        specialty,
        qualifications,
        experienceYears,
        consultationFee,
        location,
        slotDurationMin,
        maxPatientsPerSlot,
        isAcceptingAppointments,
        timezone,
      },
    },
    { new: true, runValidators: true },
  );

  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        doctorProfile,
        "Doctor profile updated successfully",
      ),
    );
});

export const defineWeeklyAvailability = asyncHandler(async (req, res) => {
  const { weeklyAvailability } = req.body;

  if (!weeklyAvailability) {
    throw new ApiError(400, "Weekly availability data is required");
  }

  const doctorProfile = await doctorProfileModel.findOne({
    userId: req.user?._id,
  });

  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  doctorProfile.weeklyAvailability = weeklyAvailability;

  const updatedProfile = await doctorProfile.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedProfile,
        "Weekly availability updated successfully",
      ),
    );
});

export const updateBlackoutDates = asyncHandler(async (req, res) => {
  const { blackoutDates } = req.body;

  if (!blackoutDates || !Array.isArray(blackoutDates)) {
    throw new ApiError(400, "Blackout dates are required and must be an array");
  }

  const doctorProfile = await doctorProfileModel.findOne({
    userId: req.user?._id,
  });

  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  const uniqueBlackoutDates = [...new Set(blackoutDates)];
  doctorProfile.blackoutDates = uniqueBlackoutDates;

  const updatedProfile = await doctorProfile.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedProfile,
        "Blackout dates updated successfully",
      ),
    );
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const doctorProfile = await doctorProfileModel.findOne({
    userId: req.user?._id,
  });

  if (!doctorProfile) {
    return res
      .status(404)
      .json(
        new ApiResponse(
          404,
          null,
          "Doctor Profile Not Found, Please create a Doctor Profile",
        ),
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, doctorProfile, "Doctor Profile Fetch successfully"),
    );
});

const getNextOpenSlots = async (doctor, startDate, n = 5) => {
  const slots = [];
  const now = DateTime.utc();
  const tz = doctor.timezone || IST;

  let startLocal = DateTime.fromJSDate(startDate, { zone: tz }).startOf("day");
  if (startLocal < now.setZone(tz).startOf("day")) {
    startLocal = now.setZone(tz).startOf("day");
  }

  const DAY_MAP = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  let curLocal = startLocal;

  for (let i = 0; i < 30 && slots.length < n; i++) {
    const dateStr = curLocal.toFormat("yyyy-MM-dd");
    const dayName = DAY_MAP[curLocal.weekday - 1];

    if (!doctor.blackoutDates?.includes(dateStr)) {
      const windows = doctor.weeklyAvailability?.[dayName] || [];
      const sortedWindows = [...windows].sort((a, b) =>
        a.start.localeCompare(b.start),
      );

      for (const window of sortedWindows) {
        const [startH, startM] = window.start.split(":").map(Number);
        const [endH, endM] = window.end.split(":").map(Number);

        let currentTotalM = startH * 60 + startM;
        const endTotalM = endH * 60 + endM;

        while (
          currentTotalM + doctor.slotDurationMin <= endTotalM &&
          slots.length < n
        ) {
          const h = Math.floor(currentTotalM / 60);
          const m = currentTotalM % 60;

          const slotStartLocal = curLocal.set({ hour: h, minute: m });
          const slotEndLocal = slotStartLocal.plus({
            minutes: doctor.slotDurationMin,
          });

          const slotStartUTC = slotStartLocal.toUTC();
          const slotEndUTC = slotEndLocal.toUTC();

          if (slotStartUTC > now) {
            const bookedCount = await appointmentModel.countDocuments({
              doctorId: doctor._id,
              status: { $in: ["PENDING", "CONFIRMED"] },
              slotStartUTC: { $lt: slotEndUTC.toJSDate() },
              slotEndUTC: { $gt: slotStartUTC.toJSDate() },
            });

            slots.push({
              date: dateStr,
              time: slotStartLocal.toFormat("HH:mm"),
              endTime: slotEndLocal.toFormat("HH:mm"),
              slotStartUTC: slotStartUTC.toISO(),
              slotEndUTC: slotEndUTC.toISO(),
              isFull: bookedCount >= doctor.maxPatientsPerSlot,
            });
          }

          currentTotalM += doctor.slotDurationMin;
        }
      }
    }

    curLocal = curLocal.plus({ days: 1 });
  }

  return slots;
};

export const searchDoctor = asyncHandler(async (req, res) => {
  const { specialty, location, date, n = 5 } = req.query;

  const query = { isAcceptingAppointments: true };

  if (specialty) {
    query.specialty = { $regex: specialty, $options: "i" };
  }

  if (location) {
    query.location = { $regex: location, $options: "i" };
  }

  const doctors = await doctorProfileModel
    .find(query)
    .populate("userId", "username email");

  const searchDate = date ? new Date(`${date}T00:00:00`) : new Date();
  if (isNaN(searchDate.getTime())) {
    throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
  }

  const results = await Promise.all(
    doctors.map(async (doctor) => {
      const nextSlots = await getNextOpenSlots(doctor, searchDate, parseInt(n));
      return {
        ...doctor.toObject(),
        nextSlots,
      };
    }),
  );

  let filteredResults = results;
  if (date) {
    filteredResults = results.filter((d) =>
      d.nextSlots.some((s) => s.date === date),
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, filteredResults, "Doctors fetched successfully"),
    );
});