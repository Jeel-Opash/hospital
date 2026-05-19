export const getBrowserTimezone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

export const formatSlot = (value, timezone = getBrowserTimezone()) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));

export const addMinutes = (iso, minutes) =>
  new Date(new Date(iso).getTime() + Number(minutes) * 60000).toISOString();

export const getId = (value) => value?._id || value?.id || null;
