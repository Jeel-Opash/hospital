/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { DoctorUserMenu } from "../../components/UserMenu";
import { getDoctorProfile, updateDoctorProfile } from "../../api/doctorApi";
import CreateDoctorProfile from "./CreateDoctorProfile";
import { parseProfileForm, profileToForm } from "./doctorUtils.jsx";

const doctorKeys = ["doctor-profile", "doctor-day", "doctor-appointments", "doctor-past", "doctor-cancelled"];

const DoctorShell = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState(null);

  const profileQuery = useQuery({ queryKey: ["doctor-profile"], queryFn: getDoctorProfile, retry: false });
  const profile = profileQuery.data ?? null;

  const invalidateDoctorData = () => {
    doctorKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  const profileMutation = useMutation({
    mutationFn: updateDoctorProfile,
    onSuccess: () => {
      toast.success("Profile saved");
      invalidateDoctorData();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save profile"),
  });

  useEffect(() => {
    if (profile) setProfileForm(profileToForm(profile));
  }, [profile]);

  const setFormField = (key, value) => setProfileForm((current) => ({ ...current, [key]: value }));
  const saveProfile = (event) => {
    event.preventDefault();
    if (profileForm) profileMutation.mutate(parseProfileForm(profileForm));
  };

  if (profileQuery.isLoading) return <main className="auth-shell"><p className="muted">Loading...</p></main>;
  if (!profile) {
    return <CreateDoctorProfile onCreated={() => queryClient.invalidateQueries({ queryKey: ["doctor-profile"] })} />;
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">Doctor portal</p>
          <h1>Dr. {user?.username || "Doctor"}</h1>
        </div>
        <DoctorUserMenu pf={profileForm} setF={setFormField} saveProfile={saveProfile} profileMut={profileMutation} />
      </header>
      <nav className="page-tabs">
        <NavLink to="/doctor" end>Appointments</NavLink>
        <NavLink to="/doctor/availability">Weekly Availability</NavLink>
        <NavLink to="/doctor/blackouts">Blackout Dates</NavLink>
      </nav>
      {children({ profile, timezone: profile.timezone || "Asia/Kolkata", invalidateDoctorData })}
    </main>
  );
};

export default DoctorShell;
