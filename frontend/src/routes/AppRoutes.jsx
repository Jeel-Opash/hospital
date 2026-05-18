import { Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ProtectedRoute from "../components/ProtectRoute";

const Dashboard = ({ title }) => (
  <main className="grid min-h-screen place-items-center bg-[#eef6f4] px-4">
    <section className="w-full max-w-xl rounded-3xl bg-white p-8 text-center shadow-2xl shadow-slate-200">
      <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
      <p className="mt-3 text-slate-600">You are logged in successfully.</p>
    </section>
  </main>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/patient"
        element={
          <ProtectedRoute role="Patient">
            <Dashboard title="Patient Dashboard" />
          </ProtectedRoute>}/>

      <Route path="/doctor"
        element={
          <ProtectedRoute role="Doctor">
            <Dashboard title="Doctor Dashboard" />
          </ProtectedRoute>}/>

      <Route path="/admin"
        element={
          <ProtectedRoute role="Clinic Admin">
            <Dashboard title="Clinic Admin Dashboard" />
          </ProtectedRoute>}/>
    </Routes>
  );
};

export default AppRoutes;
