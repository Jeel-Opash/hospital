import { Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ProtectedRoute from "../components/ProtectRoute";
import PatientDashboard from "../pages/patient/PatientDashboard";
import PatientAppointments from "../pages/patient/PatientAppointments";
import PatientWaitlist from "../pages/patient/PatientWaitlist";
import DoctorDashboard from "../pages/doctor/DoctorDashboard";
import DoctorAvailability from "../pages/doctor/DoctorAvailability";
import DoctorBlackouts from "../pages/doctor/DoctorBlackouts";
import AdminDashboard from "../pages/admin/AdminDashboard";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/patient"
        element={
          <ProtectedRoute role="Patient">
            <PatientDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/appointments"
        element={
          <ProtectedRoute role="Patient">
            <PatientAppointments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/waitlist"
        element={
          <ProtectedRoute role="Patient">
            <PatientWaitlist />
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor"
        element={
          <ProtectedRoute role="Doctor">
            <DoctorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor/availability"
        element={
          <ProtectedRoute role="Doctor">
            <DoctorAvailability />
          </ProtectedRoute>
        }
      />

      <Route
        path="/doctor/blackouts"
        element={
          <ProtectedRoute role="Doctor">
            <DoctorBlackouts />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="Clinic Admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
