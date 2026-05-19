import axiosInstance from "./axios.js";

export const fetchClinicStats = () =>
  axiosInstance.get("/clinic-admin/stats").then((r) => r.data.data);

export const fetchAllDoctors = (params = {}) =>
  axiosInstance.get("/clinic-admin/doctors", { params }).then((r) => r.data.data);

export const fetchAllPatients = (params = {}) =>
  axiosInstance.get("/clinic-admin/patients", { params }).then((r) => r.data.data);

export const fetchAllAppointments = (params = {}) =>
  axiosInstance.get("/clinic-admin/appointments", { params }).then((r) => r.data.data);

export const fetchAppointmentsPerDoctor = (params = {}) =>
  axiosInstance.get("/clinic-admin/appointments-per-doctor", { params }).then((r) => r.data.data);

export const updateAppointmentStatus = (id, status) =>
  axiosInstance.patch(`/clinic-admin/appointments/${id}/status`, { status }).then((r) => r.data.data);

export const toggleDoctorAcceptance = (id) =>
  axiosInstance.patch(`/clinic-admin/doctors/${id}/toggle-acceptance`).then((r) => r.data.data);

export const emergencyAddDoctor = (payload) =>
  axiosInstance.post("/clinic-admin/emergency/doctor", payload).then((r) => r.data.data);

export const emergencyAddPatient = (payload) =>
  axiosInstance.post("/clinic-admin/emergency/patient", payload).then((r) => r.data.data);

export const deleteDoctor = (id) =>
  axiosInstance.delete(`/clinic-admin/doctors/${id}`).then((r) => r.data.data);

export const deletePatient = (id) =>
  axiosInstance.delete(`/clinic-admin/patients/${id}`).then((r) => r.data.data);

export const updateDoctorDetails = (id, payload) =>
  axiosInstance.patch(`/clinic-admin/doctors/${id}`, payload).then((r) => r.data.data);
