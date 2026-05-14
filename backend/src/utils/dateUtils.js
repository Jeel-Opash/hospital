import { DateTime } from "luxon";
export const IST = "Asia/Calcutta";
export const DATE_FORMAT = "ccc, MMM d, yyyy";
export const TIME_FORMAT = "hh:mm a";
export const DATETIME_FORMAT = "ccc, MMM d, yyyy, hh:mm a ZZZZ";

export const toIST = (value) => {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value, { zone: "utc" }).setZone(IST);
  }
  return DateTime.fromISO(value, { zone: "utc" }).setZone(IST);
};

export const formatDateIST = (value) => toIST(value).toFormat(DATE_FORMAT);

export const formatTimeIST = (value) => toIST(value).toFormat(TIME_FORMAT);

export const formatDateTimeIST = (value) =>
  toIST(value).toFormat(DATETIME_FORMAT);

export const formatSlotRangeIST = (start, end) =>
  `${formatTimeIST(start)} \u2013 ${formatTimeIST(end)}`;

export const nowIST = () => DateTime.now().setZone(IST);

export const todayIST = () => nowIST().toFormat("yyyy-MM-dd");