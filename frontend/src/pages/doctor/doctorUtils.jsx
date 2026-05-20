import { useState, useEffect } from "react";

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

// Convert "HH:MM" 24h → { h12, minute, period }  and back
const to12 = (hhmm) => {
  if (!hhmm) return { h12: "12", minute: "00", period: "AM" };
  const [h, m] = hhmm.split(":").map(Number);
  return { h12: String(h === 0 ? 12 : h > 12 ? h - 12 : h).padStart(2, "0"), minute: String(m).padStart(2, "0"), period: h < 12 ? "AM" : "PM" };
};
const to24 = (h12, minute, period) => {
  let h = Number(h12);
  if (period === "AM") h = h === 12 ? 0 : h;
  else h = h === 12 ? 12 : h + 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
};

export const fmt12 = (hhmm) => {
  if (!hhmm) return "";
  const { h12, minute, period } = to12(hhmm);
  return `${h12}:${minute} ${period}`;
};

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export const TimePicker = ({ value, onChange, disabled }) => {
  const [state, setState] = useState(() => to12(value || ""));

  useEffect(() => { setState(to12(value || "")); }, [value]);

  const update = (patch) => {
    const next = { ...state, ...patch };
    setState(next);
    onChange(to24(next.h12, next.minute, next.period));
  };

  const sel = (field, options) => (
    <select disabled={disabled} value={state[field]} onChange={(e) => update({ [field]: e.target.value })}
      style={{ width: "auto", padding: "0.72rem 0.4rem" }}>
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );

  return (
    <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
      {sel("h12", HOURS)}
      <span style={{ fontWeight: 700, color: "var(--muted)" }}>:</span>
      {sel("minute", MINUTES)}
      <select disabled={disabled} value={state.period} onChange={(e) => update({ period: e.target.value })}
        style={{ width: "auto", padding: "0.72rem 0.4rem" }}>
        <option>AM</option>
        <option>PM</option>
      </select>
    </div>
  );
};

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
