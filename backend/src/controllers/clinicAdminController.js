import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import appointmentModel from "../models/appointmentModel.js";
import { DateTime } from "luxon";
import { IST } from "../utils/dateUtils.js";

export const appointmentPerDoctors = asyncHandler(async (req, res) => {
  if (req.user?.role !== "Clinic Admin") {
    throw new ApiError(403, "Access restricted to Clinic Admins only");
  }

  const { status, from, to } = req.query;

  const matchStage = {};

  const VALID_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "CANCELLED",
    "NO_SHOW",
    "COMPLETED",
  ];
  if (status) {
    const upperStatus = status.toUpperCase();
    if (!VALID_STATUSES.includes(upperStatus)) {
      throw new ApiError(
        400,
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      );
    }
    matchStage.status = upperStatus;
  }

  if (from || to) {
    matchStage.slotStartUTC = {};

    if (from) {
      const fromDt = DateTime.fromISO(from, { zone: IST });
      if (!fromDt.isValid) {
        throw new ApiError(400, "'from' must be a valid date (YYYY-MM-DD)");
      }
      matchStage.slotStartUTC.$gte = fromDt.startOf("day").toJSDate();
    }

    if (to) {
      const toDt = DateTime.fromISO(to, { zone: IST });
      if (!toDt.isValid) {
        throw new ApiError(400, "'to' must be a valid date (YYYY-MM-DD)");
      }
      matchStage.slotStartUTC.$lte = toDt.endOf("day").toJSDate();
    }
  }

  const pipeline = [
    { $match: matchStage },

    {
      $group: {
        _id: "$doctorId",
        totalAppointments: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
        confirmed: {
          $sum: { $cond: [{ $eq: ["$status", "CONFIRMED"] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
        },
        noShow: { $sum: { $cond: [{ $eq: ["$status", "NO_SHOW"] }, 1, 0] } },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
        },
        earliestSlot: { $min: "$slotStartUTC" },
        latestSlot: { $max: "$slotStartUTC" },
      },
    },

    {
      $lookup: {
        from: "doctorprofiles",
        localField: "_id",
        foreignField: "_id",
        as: "doctorProfile",
      },
    },
    { $unwind: { path: "$doctorProfile", preserveNullAndEmptyArrays: false } },

    {
      $lookup: {
        from: "users",
        localField: "doctorProfile.userId",
        foreignField: "_id",
        as: "doctorUser",
      },
    },
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

  const results=await appointmentModel.aggregate(pipeline);

  const summary=results.reduce(
    (acc,row)=>{
        acc.total +=row.appointments.total;
        acc.pending +=row.appointments.pending;
        acc.confirmed +=row.appointments.confirmed;
        acc.cancelled +=row.appointments.cancelled;
        acc.noShow +=row.appointments.noShow;
        acc.completed +=row.appointments.completed;
        return acc;
    },
    {
      total:0,
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      noShow: 0,
      completed: 0,
    }
  );
  return res.status(200).json(
    new ApiResponse(
        200,{
            filters:{
        status: status?.toUpperCase() ?? "ALL",
          from: from ?? null,
          to: to ?? null,
        },
        clinicSummary: summary,
        doctorCount: results.length,
        doctors: results,
      },
      "Fetched appointments per doctor",
    ),
  );
});
