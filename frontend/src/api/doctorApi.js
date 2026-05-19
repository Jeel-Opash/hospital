import axiosInstance from "./axios.js";

export const getDoctorProfile = () =>
  axiosInstance.get("/doctor").then((r) => r.data.data);

export const createDoctorProfile = (payload) =>
  axiosInstance.post("/doctor/create", payload).then((r) => r.data.data);

export const updateDoctorProfile = (payload) =>
  axiosInstance.patch("/doctor/update", payload).then((r) => r.data.data);

export const updateWeeklyAvailability = (weeklyAvailability) =>
  axiosInstance
    .post("/doctor/weekly-availability", { weeklyAvailability })
    .then((r) => r.data.data);

export const updateBlackoutDates = (blackoutDates) =>
  axiosInstance
    .post("/doctor/blackout-dates", { blackoutDates })
    .then((r) => r.data.data);

export const getDoctorDayAppointments = (date) =>
  axiosInstance
    .get("/appointment/doctor", { params: { date } })
    .then((r) => r.data.data);

export const getAllDoctorAppointments = (params = {}) =>
  axiosInstance.get("/appointment", { params }).then((r) => r.data.data);

export const updateDoctorAppointmentStatus = (id, status) =>
  axiosInstance
    .post(`/appointment/${id}/status-update`, { status })
    .then((r) => r.data.data);

export const updateDoctorNotes = (id, doctorNotes) =>
  axiosInstance
    .post(`/appointment/${id}/update-doctor-notes`, { doctorNotes })
    .then((r) => r.data.data);
