import { ApiError } from "../utils/ApiError.js";
import { controller, ok } from "../utils/controller.js";
import appointmentModel from "../models/appointmentModel.js";
import doctorProfileModel from "../models/doctorProfileModel.js";
import userModel from "../models/userModel.js";
import { DateTime } from "luxon";
import { IST } from "../utils/dateUtils.js";

const VALID_STATUSES = ["PENDING", "CONFIRMED", "CANCELLED", "NO_SHOW", "COMPLETED"];
const STATUS_KEYS = ["total", "pending", "confirmed", "cancelled", "noShow", "completed"];

function buildMatchStage({ status, from, to }) {
  const match = {};

  if (status) {
    const upper = status.toUpperCase();
    if (!VALID_STATUSES.includes(upper))
      throw new ApiError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
    match.status = upper;
  }

  if (from || to) {
    match.slotStartUTC = {};
    if (from) {
      const dt = DateTime.fromISO(from, { zone: IST });
      if (!dt.isValid) throw new ApiError(400, "'from' must be a valid date (YYYY-MM-DD)");
      match.slotStartUTC.$gte = dt.startOf("day").toJSDate();
    }
    if (to) {
      const dt = DateTime.fromISO(to, { zone: IST });
      if (!dt.isValid) throw new ApiError(400, "'to' must be a valid date (YYYY-MM-DD)");
      match.slotStartUTC.$lte = dt.endOf("day").toJSDate();
    }
  }

  return match;
}

function buildPipeline(matchStage) {
  const statusCount = (s) => ({ $sum: { $cond: [{ $eq: ["$status", s] }, 1, 0] } });

  return [
    { $match: matchStage },
    {
      $group: {
        _id: "$doctorId",
        totalAppointments: { $sum: 1 },
        pending: statusCount("PENDING"),
        confirmed: statusCount("CONFIRMED"),
        cancelled: statusCount("CANCELLED"),
        noShow: statusCount("NO_SHOW"),
        completed: statusCount("COMPLETED"),
        earliestSlot: { $min: "$slotStartUTC" },
        latestSlot: { $max: "$slotStartUTC" },
      },
    },
    { $lookup: { from: "doctorprofiles", localField: "_id", foreignField: "_id", as: "doctorProfile" } },
    { $unwind: { path: "$doctorProfile", preserveNullAndEmptyArrays: false } },
    { $lookup: { from: "users", localField: "doctorProfile.userId", foreignField: "_id", as: "doctorUser" } },
    { $unwind: { path: "$doctorUser", preserveNullAndEmptyArrays: false } },
    { $sort: { totalAppointments: -1 } },
    {
      $project: {
        _id: 0,
        doctorId: "$_id",
        doctor: {
          name: "$doctorUser.username",
          email: "$doctorUser.email",
          specialty: "$doctorProfile.specialty",
          location: "$doctorProfile.location",
          consultationFee: "$doctorProfile.consultationFee",
          slotDurationMin: "$doctorProfile.slotDurationMin",
          isAcceptingAppointments: "$doctorProfile.isAcceptingAppointments",
        },
        appointments: {
          total: "$totalAppointments",
          pending: "$pending",
          confirmed: "$confirmed",
          cancelled: "$cancelled",
          noShow: "$noShow",
          completed: "$completed",
        },
        earliestSlot: 1,
        latestSlot: 1,
      },
    },
  ];
}

export const getClinicStats = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const tz = IST;
  const todayStart = DateTime.now().setZone(tz).startOf("day").toJSDate();
  const todayEnd = DateTime.now().setZone(tz).endOf("day").toJSDate();

  const [totalDoctors, totalPatients, todayAppointments, allAppointments] = await Promise.all([
    userModel.countDocuments({ role: "Doctor" }),
    userModel.countDocuments({ role: "Patient" }),
    appointmentModel.countDocuments({
      slotStartUTC: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ["PENDING", "CONFIRMED"] },
    }),
    appointmentModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ["$status", "NO_SHOW"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const stats = allAppointments[0] ?? { total: 0, completed: 0, noShow: 0, cancelled: 0 };
  const utilization = stats.total > 0
    ? Math.round(((stats.completed + stats.noShow) / stats.total) * 100)
    : 0;
  const noShowRate = stats.total > 0
    ? Math.round((stats.noShow / stats.total) * 100)
    : 0;

  return ok(
    {
      totalDoctors,
      totalPatients,
      todayAppointments,
      totalAppointments: stats.total,
      completedAppointments: stats.completed,
      cancelledAppointments: stats.cancelled,
      noShowRate: `${noShowRate}%`,
      utilization: `${utilization}%`,
    },
    "Clinic stats fetched",
  );
});

export const getAllDoctors = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { specialty, location, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (specialty) filter.specialty = { $regex: specialty, $options: "i" };
  if (location) filter.location = { $regex: location, $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);
  const [doctors, total] = await Promise.all([
    doctorProfileModel
      .find(filter)
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "username email isAvailable")
      .lean(),
    doctorProfileModel.countDocuments(filter),
  ]);

  return ok(
    { total, page: Number(page), limit: Number(limit), doctors },
    "Doctors fetched",
  );
});

export const getAllPatients = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { search, page = 1, limit = 20 } = req.query;
  const filter = { role: "Patient" };
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [patients, total] = await Promise.all([
    userModel
      .find(filter)
      .select("-password")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean(),
    userModel.countDocuments(filter),
  ]);

  return ok(
    { total, page: Number(page), limit: Number(limit), patients },
    "Patients fetched",
  );
});

export const emergencyAddPatient = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    throw new ApiError(400, "username, email, and password are required");
  }

  const existedUser = await userModel.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists");
  }

  const patient = await userModel.create({
    username,
    email,
    password,
    role: "Patient",
  });

  const safePatient = await userModel.findById(patient._id).select("-password").lean();
  return ok(safePatient, "Emergency patient added");
});

export const emergencyAddDoctor = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const {
    username,
    email,
    password,
    specialty,
    location,
    slotDurationMin = 30,
    timezone = IST,
    consultationFee = 0,
    experienceYears = 0,
  } = req.body;

  if (!username || !email || !password || !specialty || !location) {
    throw new ApiError(
      400,
      "username, email, password, specialty, and location are required",
    );
  }

  const existedUser = await userModel.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with username or email already exists");
  }

  const doctorUser = await userModel.create({
    username,
    email,
    password,
    role: "Doctor",
  });

  const profile = await doctorProfileModel.create({
    userId: doctorUser._id,
    specialty,
    location,
    slotDurationMin,
    timezone,
    consultationFee,
    experienceYears,
    isAcceptingAppointments: true,
  });

  const safeDoctor = await userModel.findById(doctorUser._id).select("-password").lean();
  return ok({ user: safeDoctor, profile }, "Emergency doctor added");
});

export const deletePatient = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { id } = req.params;
  const patient = await userModel.findOne({ _id: id, role: "Patient" });
  if (!patient) throw new ApiError(404, "Patient not found");

  await appointmentModel.deleteMany({ patientId: patient._id });
  await userModel.deleteOne({ _id: patient._id });

  return ok({ patientId: id }, "Patient deleted");
});

export const deleteDoctor = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { id } = req.params;
  const doctorProfile = await doctorProfileModel.findById(id);
  if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

  await appointmentModel.deleteMany({ doctorId: doctorProfile._id });
  await doctorProfileModel.deleteOne({ _id: doctorProfile._id });
  await userModel.deleteOne({ _id: doctorProfile.userId, role: "Doctor" });

  return ok({ doctorId: id }, "Doctor deleted");
});

export const updateDoctorByAdmin = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { id } = req.params;
  const {
    username,
    email,
    specialty,
    location,
    slotDurationMin,
    timezone,
    consultationFee,
    isAcceptingAppointments,
  } = req.body;

  const doctorProfile = await doctorProfileModel.findById(id);
  if (!doctorProfile) throw new ApiError(404, "Doctor profile not found");

  const doctorUser = await userModel.findById(doctorProfile.userId);
  if (!doctorUser) throw new ApiError(404, "Doctor user not found");

  if (username || email) {
    const duplicate = await userModel.findOne({
      _id: { $ne: doctorUser._id },
      $or: [
        ...(username ? [{ username }] : []),
        ...(email ? [{ email }] : []),
      ],
    });
    if (duplicate) {
      throw new ApiError(409, "Another user already has this username or email");
    }
  }

  if (username) doctorUser.username = username;
  if (email) doctorUser.email = email;
  await doctorUser.save();

  if (specialty) doctorProfile.specialty = specialty;
  if (location) doctorProfile.location = location;
  if (slotDurationMin) doctorProfile.slotDurationMin = Number(slotDurationMin);
  if (timezone) doctorProfile.timezone = timezone;
  if (consultationFee !== undefined) doctorProfile.consultationFee = Number(consultationFee);
  if (isAcceptingAppointments !== undefined) {
    doctorProfile.isAcceptingAppointments = Boolean(isAcceptingAppointments);
  }

  await doctorProfile.save();
  await doctorProfile.populate("userId", "username email isAvailable");

  return ok(doctorProfile, "Doctor details updated");
});

export const getAllAppointments = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { status, from, to, page = 1, limit = 20 } = req.query;
  const matchStage = buildMatchStage({ status, from, to });
  const skip = (Number(page) - 1) * Number(limit);

  const [appointments, total] = await Promise.all([
    appointmentModel
      .find(matchStage)
      .sort({ slotStartUTC: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({ path: "doctorId", select: "specialty location", populate: { path: "userId", select: "username email" } })
      .populate("patientId", "username email")
      .lean(),
    appointmentModel.countDocuments(matchStage),
  ]);

  return ok(
    { total, page: Number(page), limit: Number(limit), appointments },
    "Appointments fetched",
  );
});

export const adminUpdateAppointmentStatus = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status?.toUpperCase()))
    throw new ApiError(400, `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);

  const appointment = await appointmentModel.findById(id);
  if (!appointment) throw new ApiError(404, "Appointment not found");

  appointment.status = status.toUpperCase();
  if (appointment.status === "CANCELLED") {
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user._id;
  }
  await appointment.save();

  return ok(
    { bookingId: appointment.bookingId, status: appointment.status },
    "Appointment status updated",
  );
});

export const toggleDoctorAcceptance = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { id } = req.params; // doctorProfile _id
  const doctor = await doctorProfileModel.findById(id);
  if (!doctor) throw new ApiError(404, "Doctor profile not found");

  doctor.isAcceptingAppointments = !doctor.isAcceptingAppointments;
  await doctor.save();

  return ok(
    { doctorId: doctor._id, isAcceptingAppointments: doctor.isAcceptingAppointments },
    `Doctor is now ${doctor.isAcceptingAppointments ? "accepting" : "not accepting"} appointments`,
  );
});

export const appointmentPerDoctors = controller(async (req, res) => {
  if (req.user?.role !== "Clinic Admin")
    throw new ApiError(403, "Access restricted to Clinic Admins only");

  const { status, from, to } = req.query;
  const matchStage = buildMatchStage({ status, from, to });
  const results = await appointmentModel.aggregate(buildPipeline(matchStage));

  const summary = results.reduce(
    (acc, { appointments: a }) => {
      STATUS_KEYS.forEach((k) => (acc[k] += a[k] ?? 0));
      return acc;
    },
    Object.fromEntries(STATUS_KEYS.map((k) => [k, 0])),
  );

  return ok(
    {
      filters: { status: status?.toUpperCase() ?? "ALL", from: from ?? null, to: to ?? null },
      clinicSummary: summary,
      doctorCount: results.length,
      doctors: results,
    },
    "Fetched appointments per doctor",
  );
});
