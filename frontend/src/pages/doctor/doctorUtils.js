export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DEF_AVAIL = Object.fromEntries(
  DAYS.map((day) => [day, ["Sat", "Sun"].includes(day) ? [] : [{ start: "09:00", end: "17:00" }]]),
);

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtTime = (value, timezone = "Asia/Kolkata") =>
  new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));

export const fmtDate = (value, timezone = "Asia/Kolkata") =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(value));

const numFields = ["experienceYears", "consultationFee", "slotDurationMin", "maxPatientsPerSlot"];

export const parseProfileForm = (form) => ({
  ...form,
  qualifications: form.qualifications.split(",").map((item) => item.trim()).filter(Boolean),
  ...Object.fromEntries(numFields.map((key) => [key, Number(form[key])])),
});

export const profileToForm = (profile) => ({
  specialty: profile.specialty || "",
  qualifications: (profile.qualifications || []).join(", "),
  experienceYears: profile.experienceYears ?? 0,
  consultationFee: profile.consultationFee ?? 0,
  location: profile.location || "",
  slotDurationMin: profile.slotDurationMin || 30,
  maxPatientsPerSlot: profile.maxPatientsPerSlot || 1,
  timezone: profile.timezone || "Asia/Kolkata",
  isAcceptingAppointments: Boolean(profile.isAcceptingAppointments),
});
