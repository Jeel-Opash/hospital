import axiosInstance from "./axios.js";

export const searchDoctors = (params = {}) =>
  axiosInstance.get("/doctor/search", { params }).then((r) => r.data.data);

export const getPatientAppointments = () =>
  axiosInstance.get("/appointment/patient").then((r) => r.data.data);

export const bookAppointment = (payload) =>
  axiosInstance.post("/appointment/book", payload).then((r) => r.data.data);

export const cancelAppointment = (id, reason) =>
  axiosInstance.put(`/appointment/${id}/cancel`, { reason }).then((r) => r.data.data);

export const rescheduleAppointment = (id, payload) =>
  axiosInstance.post(`/appointment/${id}/reschedule`, payload).then((r) => r.data.data);

export const joinWaitlist = (payload) =>
  axiosInstance.post("/waitlist/join", payload).then((r) => r.data.data);

export const getMyWaitlist = (timezone) =>
  axiosInstance.get("/waitlist/my", { params: { timezone } }).then((r) => r.data.data);

export const leaveWaitlist = (waitlistId) =>
  axiosInstance.delete(`/waitlist/${waitlistId}`).then((r) => r.data.data);
