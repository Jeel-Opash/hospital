import appointmentModel from "../models/appointmentModel.js";
import doctorProfileModel from "../models/doctorProfileModel.js";
import userModel from "../models/userModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { DateTime } from "luxon";
import { IST } from "../utils/dateUtils.js";

const DAY_MAP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const bookAppoinment = asyncHandler(async (req, res) => {
  const { doctorId, slotStartUTC: rawStart, slotEndUTC: rawEnd,
    reason, notes, timezone = IST, } = req.body;

  if (!doctorId || !rawStart || !rawEnd || !reason) {
    throw new ApiError(400,
      "doctorId, slotStartUTC, slotEndUTC, and reason are required",
    );
  }
  const slotStart = DateTime.fromISO(rawStart, { zone: "utc" });
  const slotEnd = DateTime.fromISO(rawEnd, { zone: "utc" });
  if (!slotStart.isValid || !slotEnd.isValid) {
    throw new ApiError(400, "slotStartUTC and slotEndUTC must be valid datetime strings ",);
  }
  if (slotEnd <= slotStart) {
    throw new ApiError(400, "slotEndUTC must be after slotStartUTC");
  }
  if (slotStart <= DateTime.utc()) {
    throw new ApiError(400, "Cannot book a slot in the past");
  }
  const doctor = await doctorProfileModel.findById(doctorId).lean();
  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }
  if (!doctor.isAcceptingAppointments) {
    throw new ApiError(409,
      "This doctor is not accepting appointments at the moment",);
  }

  const doctorTz = doctor.timezone || "utc";
  const slotStartLocal = slotStart.setZone(doctorTz);
  const slotEndLocal = slotEnd.setZone(doctorTz);

  const slotDateStr = slotStartLocal.toFormat("yyyy-MM-dd");
  const dayKey = DAY_MAP[slotStartLocal.weekday % 7];

  const windows = doctor.weeklyAvailability?.[dayKey] ?? [];

  if (windows.length == 0) {
    throw new ApiError(409, `Dr. is not available on ${dayKey}s`);
  }
  if (doctor.blackoutDates?.includes(slotDateStr)) {
    throw new ApiError(409, `The date ${slotDateStr} is blocked by the doctor`);
  }
  const reqStartHHMM = slotStartLocal.toFormat("HH:mm");
  const reqEndHHMM = slotEndLocal.toFormat("HH:mm");
  const fitsWindow = windows.some((w) =>
    reqStartHHMM >= w.start && reqEndHHMM <= w.end,);

  if (!fitsWindow) {
    throw new ApiError(409,
      `Requested time ${reqStartHHMM}–${reqEndHHMM} is outside the doctor's availability window on ${dayKey}`,
    );
  }

  const requestedDurationMin = slotEnd.diff(slotStart, "minutes").minutes;
  if (requestedDurationMin !== doctor.slotDurationMin) {
    throw new ApiError(
      400,
      `Slot duration must be exactly ${doctor.slotDurationMin} minutes for this doctor`,
    );
  }

  const conflictCount = await appointmentModel.countDocuments({
    doctorId, status: { $in: ["PENDING", "CONFIRMED"] },
    slotStartUTC: { $lt: slotEnd.toJSDate() },
    slotEndUTC: { $gt: slotStart.toJSDate() },
  })
  if (conflictCount >= doctor.maxPatientsPerSlot) {
    throw new ApiError(409, "This slot is fully booked. Please choose another time.",);
  }

  const patientId = req.user?._id;
  if (!patientId) {
    throw new ApiError(401, "Authentication required to book an appointment");
  }
  const patient = await userModel.findById(patientId)
    .select("username email role").lean();

  if (!patient) {
    throw new ApiError(404, "Authenticated patient not found")
  }
  if (patient.role !== "Patient") {
    throw new ApiError(403, "Only patients can book appointments")
  }

  const appointment = await appointmentModel.create({
    doctorId, patientId,
    slotStartUTC: slotStart.toJSDate(),
    slotEndUTC: slotEnd.toJSDate(),
    reason: reason.trim(),
    ...(notes ? { notes: notes.trim() } : {}),
    status: "PENDING",
  })
  let localTime;
  try {
    localTime = appointment.toLocalTime(timezone || IST);
  } catch {
    localTime = appointment.toLocalTime(IST);
  }
  return res.status(201).json(
    new ApiResponse(
      201,
      {
        bookingId: appointment.bookingId,
        status: appointment.status,

        slot: {
          startUTC: slotStart.toISO(),
          endUTC: slotEnd.toISO(),
          durationMin: requestedDurationMin,
          localStart: localTime.displayStart,
          localEnd: localTime.displayEnd,
          timezone,
        },

        patient: {
          id: patient._id,
          username: patient.username,
          email: patient.email,
        },

        doctor: {
          id: doctor._id,
          specialty: doctor.specialty,
          consultationFee: doctor.consultationFee,
          location: doctor.location,
        },

        reason: appointment.reason,
        ...(appointment.notes ? { notes: appointment.notes } : {}),
        bookedAt: appointment.createdAt,
      },
      "Appointment booked successfully",
    ),
  );
});

export const getAppointmentByPatient = asyncHandler(async (req, res) => {
  const patientId = req.user?._id;

  if (!patientId) {
    throw new ApiError(401, "Authentication required");
  }
  if (req.user.role !== "Patient") {
    throw new ApiError(403, "Only patients can view their appointments");
  }
  const appointments = await appointmentModel
    .find({ patientId })
    .sort({ slotStartUTC: 1 })
    .populate({
      path: "doctorId",
      select: "specialty consultationFee location slotDurationMin",
      populate: {
        path: "userId",
        select: "username email",
      },
    })
    .populate({
      path: "patientId",
      select: "username email",
    })
    .lean();

  const shaped = appointments.map((appt) => ({
    _id: appt._id,
    bookingId: appt.bookingId,
    status: appt.status,

    slot: {
      startUTC: appt.slotStartUTC,
      endUTC: appt.slotEndUTC,
    },

    doctor: appt.doctorId
      ? {
        id: appt.doctorId._id,
        name: appt.doctorId.userId?.username ?? null,
        email: appt.doctorId.userId?.email ?? null,
        specialty: appt.doctorId.specialty,
        consultationFee: appt.doctorId.consultationFee,
        location: appt.doctorId.location,
        slotDurationMin: appt.doctorId.slotDurationMin,
      }
      : null,

    patient: appt.patientId
      ? {
        id: appt.patientId._id,
        username: appt.patientId.username,
        email: appt.patientId.email,
      }
      : null,

    reason: appt.reason,
    notes: appt.notes ?? null,
    bookedAt: appt.createdAt,
    cancelledAt: appt.cancelledAt ?? null,
    cancellationReason: appt.cancellationReason ?? null,
    doctorNotes: appt.doctorNotes ?? "",
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, shaped, "Fetched patient appointments"));
});

export const getAppointmentByDoctor = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { date } = req.query;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "Doctor") {
    throw new ApiError(403, "Only doctors can view these appointments");
  }

  const doctorProfile = await doctorProfileModel.findOne({ userId }).lean();
  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  const filter = { doctorId: doctorProfile._id };

  const tz = doctorProfile.timezone || IST;
  const targetDate = date || DateTime.now().setZone(tz).toISODate();

  const startOfDay = DateTime.fromISO(targetDate, { zone: tz })
    .startOf("day")
    .toJSDate();
  const endOfDay = DateTime.fromISO(targetDate, { zone: tz })
    .endOf("day")
    .toJSDate();

  filter.slotStartUTC = { $gte: startOfDay, $lte: endOfDay };

  const appointments = await appointmentModel
    .find(filter)
    .sort({ slotStartUTC: 1 })
    .populate({
      path: "doctorId",
      select: "specialty consultationFee location slotDurationMin",
      populate: {
        path: "userId",
        select: "username email",
      },
    })
    .populate({
      path: "patientId",
      select: "username email",
    })
    .lean();

  const shaped = appointments.map((appt) => ({
    _id: appt._id,
    bookingId: appt.bookingId,
    status: appt.status,

    slot: {
      startUTC: appt.slotStartUTC,
      endUTC: appt.slotEndUTC,
    },

    doctor: appt.doctorId
      ? {
        id: appt.doctorId._id,
        name: appt.doctorId.userId?.username ?? null,
        email: appt.doctorId.userId?.email ?? null,
        specialty: appt.doctorId.specialty,
        consultationFee: appt.doctorId.consultationFee,
        location: appt.doctorId.location,
        slotDurationMin: appt.doctorId.slotDurationMin,
      }
      : null,

    patient: appt.patientId
      ? {
        id: appt.patientId._id,
        username: appt.patientId.username,
        email: appt.patientId.email,
      }
      : null,

    reason: appt.reason,
    notes: appt.notes ?? null,
    bookedAt: appt.createdAt,
    cancelledAt: appt.cancelledAt ?? null,
    cancellationReason: appt.cancellationReason ?? null,
    doctorNotes: appt.doctorNotes ?? "",
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, shaped, "Fetched doctor appointments"));
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  const appointment = await appointmentModel.findById(id).populate("doctorId");
  if (!appointment) {
    throw new ApiError(404, "Appoint not found");
  }
  const isPatient = appointment.patientId.toString() === userId.toString();
  const isDoctor = appointment.doctorId.userId.toString() === userId.toString();

  if (!isPatient && !isDoctor) {
    throw new ApiError(
      403, "only doctor & patient permission to cancel this appointment",
    );
  }
  if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
    throw new ApiError(400, `Appointment is already ${appointment.status.toLowerCase()}`,);
  }

  if (isPatient && !appointment.isCancellable(4)) {
    throw new ApiError(
      400, "Appoinments cancelled at least 4 hours in advance",
    )
  }
  appointment.status = "CANCELLED";
  appointment.cancelledAt = new Date();
  appointment.cancelledBy = userId;
  appointment.cancellationReason = reason || "Cancelled by user";
  await appointment.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { bookingId: appointment.bookingId, status: appointment.status },
        "Appointment cancelled successfully",
      ),
    );
});


export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newSlotStartUTC: rawStart, newSlotEndUTC: rawEnd, timezone = IST, } = req.body;
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }
  if (!rawStart || !rawEnd) {
    throw new ApiError(400, "newSlotStartUTC and newSlotEndUTC are required")
  }
  try {
    const oldAppointment = await appointmentModel.findById(id)
      .populate("doctorId");
    if (!oldAppointment) {
      throw new ApiError(404, "Appointment not found");
    }

    const isPatient = oldAppointment.patientId.toString() === userId.toString();
    const isDoctor = oldAppointment.doctorId.userId.toString() === userId.toString();

    if (!isPatient && !isDoctor) {
      throw new ApiError(403,
        "only doctor & patient permission to reschedule this appointment"
      )
    }
    if (oldAppointment.status === "CANCELLED" || oldAppointment.status === "COMPLETED") {
      throw new ApiError(400,
        `can't reschedule  appointment  ${oldAppointment.status.toLowerCase()}`
      )
    }
    if (isPatient && !oldAppointment.isCancellable(4)) {
      throw new ApiError(
        400, "Appointment rescheduled at least 4 hour in advance"
      )
    }

    const slotStart = DateTime.fromISO(rawStart, { zone: "utc" });
    const slotEnd = DateTime.fromISO(rawEnd, { zone: "utc" });

    if (!slotStart.isValid || !slotEnd.isValid) {
      throw new ApiError(400,
        "newSlotStartUTC and newSlotEndUTC  valid datetime strings"
      )
    }
    if (slotEnd <= slotStart) {
      throw new ApiError(400, "newSlotEndUTC  after newSlotStartUTC");
    }
    if (slotStart <= DateTime.utc()) {
      throw new ApiError(400, "can't reschedule to a slot in the past");
    }

    const doctor = await doctorProfileModel.findById(oldAppointment.doctorId._id)
      .lean();
    if (!doctor.isAcceptingAppointments) {
      throw new ApiError(409, " doctor is not accepting appointments ");
    }

    const doctorTz = doctor.timezone || "utc";
    const slotStartLocal = slotStart.setZone(doctorTz);
    const slotEndLocal = slotEnd.setZone(doctorTz);
    const slotDateStr = slotStartLocal.toFormat("yyyy-MM-dd");
    const dayKey = DAY_MAP[slotStartLocal.weekday % 7];
    const windows = doctor.weeklyAvailability?.[dayKey] ?? [];

    if (windows.length === 0) {
      throw new ApiError(409, `Dr. is not available on ${dayKey}s`);
    }
    if (doctor.blackoutDates?.includes(slotDateStr)) {
      throw new ApiError(409, `The date ${slotDateStr} is blocked by the doctor`);
    }
    const reqStartHHMM = slotStartLocal.toFormat("HH:mm");
    const reqEndHHMM = slotEndLocal.toFormat("HH:mm");
    const fitsWindow = windows.some((w) => reqStartHHMM >= w.start &&
      reqEndHHMM <= w.end,);

    if (!fitsWindow) {
      throw new ApiError(409,
        `Requested time ${reqStartHHMM}–${reqEndHHMM} is outside the doctor's availability window on ${dayKey}`,
      );
    }

    const requestedDurationMin = slotEnd.diff(slotStart, "minutes").minutes;
    if (requestedDurationMin !== doctor.slotDurationMin) {
      throw new ApiError(
        400,
        `Slot duration must be exactly ${doctor.slotDurationMin} minutes for this doctor`,
      );
    }

    const conflictCount = await appointmentModel.countDocuments({
      doctorId: doctor._id,
      status: { $in: ["PENDING", "CONFIRMED"] },
      _id: { $ne: oldAppointment._id },
      slotStartUTC: { $lt: slotEnd.toJSDate() },
      slotEndUTC: { $gt: slotStart.toJSDate() },
    });

    if (conflictCount >= doctor.maxPatientsPerSlot) {
      throw new ApiError(
        409,
        "This slot is fully booked. Please choose another time.",
      );
    }

    oldAppointment.status = "CANCELLED";
    oldAppointment.cancelledAt = new Date();
    oldAppointment.cancelledBy = userId;
    oldAppointment.cancellationReason = "Rescheduled to a new time";
    await oldAppointment.save();

    const newAppointmentArr = await appointmentModel.create([{
      doctorId: doctor._id,
      patientId: oldAppointment.patientId,
      slotStartUTC: slotStart.toJSDate(),
      slotEndUTC: slotEnd.toJSDate(),
      reason: oldAppointment.reason,
      ...(oldAppointment.notes ? { notes: oldAppointment.notes } : {}),
      status: "PENDING",
      rescheduledFrom: oldAppointment._id,
    }]);

    const newAppointment = newAppointmentArr[0];

    let localTime;
    try {
      localTime = newAppointment.toLocalTime(timezone || IST);
    } catch {
      localTime = newAppointment.toLocalTime(IST);
    }

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          bookingId: newAppointment.bookingId,
          status: newAppointment.status,
          slot: {
            startUTC: slotStart.toISO(),
            endUTC: slotEnd.toISO(),
            durationMin: requestedDurationMin,
            localStart: localTime.displayStart,
            localEnd: localTime.displayEnd,
            timezone,
          },
          rescheduledFrom: oldAppointment.bookingId,
        },
        "Appointment rescheduled successfully",
      ),
    );
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "This slot is already booked by another patient.");
    }
    throw error;
  }
})

export const doctorUpdateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "Doctor") {
    throw new ApiError(403, "Only doctors can update appointment status");
  }

  const ALLOWED_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
  if (!status || !ALLOWED_STATUSES.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
    );
  }

  const doctorProfile = await doctorProfileModel.findOne({ userId }).lean();
  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  const appointment = await appointmentModel.findById(id);
  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (appointment.doctorId.toString() !== doctorProfile._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to update this appointment ",
    );
  }

  if (
    appointment.status === "CANCELLED" ||
    appointment.status === "COMPLETED"
  ) {
    throw new ApiError(
      400,
      `Appointment is already ${appointment.status.toLowerCase()} and cannot be modified`,
    );
  }

  appointment.status = status;
  await appointment.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { bookingId: appointment.bookingId, status: appointment.status },
        "Appointment status updated successfully",
      ),
    );
});

export const AllAppointmentsOfDoctor = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "Doctor") {
    throw new ApiError(403, "Only doctors can view appointments");
  }

  const doctorProfile = await doctorProfileModel.findOne({ userId }).lean();
  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  const { status } = req.query;

  const filter = { doctorId: doctorProfile._id };

  const ALLOWED_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
  if (status) {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status filter. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
      );
    }
    filter.status = status;
  }

  const appointments = await appointmentModel
    .find(filter)
    .sort({ slotStartUTC: -1 })
    .populate({
      path: "doctorId",
      select: "specialty consultationFee location slotDurationMin",
      populate: {
        path: "userId",
        select: "username email",
      },
    })
    .populate({
      path: "patientId",
      select: "username email",
    })
    .lean();

  const shaped = appointments.map((appt) => ({
    _id: appt._id,
    bookingId: appt.bookingId,
    status: appt.status,

    slot: {
      startUTC: appt.slotStartUTC,
      endUTC: appt.slotEndUTC,
    },

    doctor: appt.doctorId
      ? {
        id: appt.doctorId._id,
        name: appt.doctorId.userId?.username ?? null,
        email: appt.doctorId.userId?.email ?? null,
        specialty: appt.doctorId.specialty,
        consultationFee: appt.doctorId.consultationFee,
        location: appt.doctorId.location,
        slotDurationMin: appt.doctorId.slotDurationMin,
      }
      : null,

    patient: appt.patientId
      ? {
        id: appt.patientId._id,
        username: appt.patientId.username,
        email: appt.patientId.email,
      }
      : null,

    reason: appt.reason,
    notes: appt.notes ?? null,
    bookedAt: appt.createdAt,
    cancelledAt: appt.cancelledAt ?? null,
    cancellationReason: appt.cancellationReason ?? null,
    doctorNotes: appt.doctorNotes ?? "",
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { total: shaped.length, appointments: shaped },
        "Fetched all doctor appointments",
      ),
    );
});

export const updateDoctorNotes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { doctorNotes } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Authentication required");
  }

  if (req.user.role !== "Doctor") {
    throw new ApiError(403, "Only doctors can update doctor notes");
  }

  const doctorProfile = await doctorProfileModel.findOne({ userId }).lean();
  if (!doctorProfile) {
    throw new ApiError(404, "Doctor profile not found");
  }

  const appointment = await appointmentModel.findById(id);
  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (appointment.doctorId.toString() !== doctorProfile._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to update notes for this appointment",
    );
  }

  appointment.doctorNotes = doctorNotes || "";
  await appointment.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { bookingId: appointment.bookingId, doctorNotes: appointment.doctorNotes },
        "Doctor notes updated successfully",
      ),
    );
});
