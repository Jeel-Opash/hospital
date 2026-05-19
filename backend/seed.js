import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import userModel from "./src/models/userModel.js";
import doctorProfileModel from "./src/models/doctorProfileModel.js";
import appointmentModel from "./src/models/appointmentModel.js";
import { DateTime } from "luxon";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://localhost:27017/hospital";

const hash = (pw) => bcrypt.hash(pw, 10);

const weekdays = {
  Mon: [{ start: "09:00", end: "17:00" }],
  Tue: [{ start: "09:00", end: "17:00" }],
  Wed: [{ start: "09:00", end: "17:00" }],
  Thu: [{ start: "09:00", end: "17:00" }],
  Fri: [{ start: "09:00", end: "15:00" }],
  Sat: [],
  Sun: [],
};

const DOCTORS = [
  { username: "dr_sharma", email: "sharma@clinic.com", specialty: "Cardiology", location: "Mumbai", slotDurationMin: 30, timezone: "Asia/Kolkata", consultationFee: 800, experienceYears: 12 },
  { username: "dr_patel", email: "patel@clinic.com", specialty: "Dermatology", location: "Pune", slotDurationMin: 20, timezone: "Asia/Kolkata", consultationFee: 500, experienceYears: 8 },
  { username: "dr_jones", email: "jones@clinic.com", specialty: "Neurology", location: "Remote", slotDurationMin: 45, timezone: "America/New_York", consultationFee: 1200, experienceYears: 15 },
  { username: "dr_lee", email: "lee@clinic.com", specialty: "Orthopedics", location: "Delhi", slotDurationMin: 30, timezone: "Asia/Kolkata", consultationFee: 700, experienceYears: 10 },
];

const PATIENTS = [
  { username: "alice", email: "alice@patient.com" },
  { username: "bob", email: "bob@patient.com" },
  { username: "carol", email: "carol@patient.com" },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  // Clear existing seed data
  await Promise.all([
    userModel.deleteMany({ email: { $in: [...DOCTORS.map((d) => d.email), ...PATIENTS.map((p) => p.email), "admin@clinic.com"] } }),
  ]);

  // Create admin
  const adminPw = await hash("Admin@123");
  await userModel.create({ username: "clinic_admin", email: "admin@clinic.com", password: adminPw, role: "Clinic Admin" });
  console.log("✓ Admin created  →  admin@clinic.com / Admin@123");

  // Create doctors + profiles
  const doctorProfiles = [];
  for (const d of DOCTORS) {
    const pw = await hash("Doctor@123");
    const doctorUser = await userModel.create({ username: d.username, email: d.email, password: pw, role: "Doctor" });
    const profile = await doctorProfileModel.create({
      userId: doctorUser._id,
      specialty: d.specialty,
      location: d.location,
      slotDurationMin: d.slotDurationMin,
      timezone: d.timezone,
      consultationFee: d.consultationFee,
      experienceYears: d.experienceYears,
      weeklyAvailability: weekdays,
      isAcceptingAppointments: true,
      maxPatientsPerSlot: 1,
    });
    doctorProfiles.push(profile);
    console.log(`✓ Doctor created  →  ${d.email} / Doctor@123`);
  }

  // Create patients
  const patientUsers = [];
  for (const p of PATIENTS) {
    const pw = await hash("Patient@123");
    const patient = await userModel.create({ username: p.username, email: p.email, password: pw, role: "Patient" });
    patientUsers.push(patient);
    console.log(`✓ Patient created →  ${p.email} / Patient@123`);
  }

  // Seed a few future appointments
  const tomorrow = DateTime.now().setZone("Asia/Kolkata").plus({ days: 1 }).set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
  const appts = [
    {
      doctorId: doctorProfiles[0]._id,
      patientId: patientUsers[0]._id,
      slotStartUTC: tomorrow.toUTC().toJSDate(),
      slotEndUTC: tomorrow.plus({ minutes: 30 }).toUTC().toJSDate(),
      reason: "Chest pain follow-up",
      status: "CONFIRMED",
    },
    {
      doctorId: doctorProfiles[1]._id,
      patientId: patientUsers[1]._id,
      slotStartUTC: tomorrow.plus({ hours: 1 }).toUTC().toJSDate(),
      slotEndUTC: tomorrow.plus({ hours: 1, minutes: 20 }).toUTC().toJSDate(),
      reason: "Skin rash consultation",
      status: "PENDING",
    },
    {
      doctorId: doctorProfiles[0]._id,
      patientId: patientUsers[2]._id,
      slotStartUTC: tomorrow.plus({ hours: 2 }).toUTC().toJSDate(),
      slotEndUTC: tomorrow.plus({ hours: 2, minutes: 30 }).toUTC().toJSDate(),
      reason: "Annual cardiac checkup",
      status: "PENDING",
    },
  ];

  await appointmentModel.insertMany(appts);
  console.log(`✓ ${appts.length} demo appointments created`);

  console.log("\n=== Seed complete ===");
  console.log("Login credentials:");
  console.log("  Admin:   admin@clinic.com     / Admin@123");
  console.log("  Doctor:  sharma@clinic.com    / Doctor@123");
  console.log("  Patient: alice@patient.com    / Patient@123");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
