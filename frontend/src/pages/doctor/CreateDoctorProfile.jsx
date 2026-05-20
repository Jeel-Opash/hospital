import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createDoctorProfile } from "../../api/doctorApi";
import { parseProfileForm } from "./doctorUtils.jsx";

const CreateDoctorProfile = ({ onCreated }) => {
  const [form, setForm] = useState({
    specialty: "",
    qualifications: "",
    experienceYears: 0,
    consultationFee: 0,
    location: "",
    slotDurationMin: 30,
    maxPatientsPerSlot: 1,
    timezone: "Asia/Kolkata",
    isAcceptingAppointments: true,
  });

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const mutation = useMutation({
    mutationFn: createDoctorProfile,
    onSuccess: () => {
      toast.success("Profile created!");
      onCreated();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not create profile"),
  });

  const submit = (event) => {
    event.preventDefault();
    if (!form.specialty.trim() || !form.location.trim()) {
      toast.error("Specialty and location are required");
      return;
    }
    mutation.mutate(parseProfileForm(form));
  };

  const field = (label, key, extra = {}) => (
    <label key={key}>
      <span>{label}</span>
      <input value={form[key]} onChange={(event) => set(key, event.target.value)} {...extra} />
    </label>
  );

  return (
    <main className="auth-shell">
      <form className="auth-panel" style={{ width: "min(560px,100%)" }} onSubmit={submit}>
        <h1>Set up your profile</h1>
        <p style={{ color: "var(--muted)", marginTop: "0.25rem" }}>Complete your practice details before patients can book with you.</p>
        <div className="form-grid" style={{ marginTop: "1.2rem" }}>
          {field("Specialty *", "specialty", { required: true, placeholder: "e.g. Cardiology" })}
          {field("Location *", "location", { required: true, placeholder: "e.g. Mumbai" })}
          {field("Timezone", "timezone", { placeholder: "Asia/Kolkata" })}
          {field("Qualifications", "qualifications", { placeholder: "MBBS, MD (comma-separated)" })}
          {field("Experience (years)", "experienceYears", { type: "number", min: "0" })}
          {field("Consultation Fee", "consultationFee", { type: "number", min: "0" })}
          <label>
            <span>Slot Duration</span>
            <select value={form.slotDurationMin} onChange={(event) => set("slotDurationMin", event.target.value)}>
              {[15, 20, 30, 45, 60].map((value) => <option key={value} value={value}>{value} min</option>)}
            </select>
          </label>
          {field("Max Patients per Slot", "maxPatientsPerSlot", { type: "number", min: "1" })}
        </div>
        <label className="toggle-line" style={{ marginTop: "0.75rem" }}>
          <input type="checkbox" checked={form.isAcceptingAppointments} onChange={(event) => set("isAcceptingAppointments", event.target.checked)} />
          <span>Accept appointments immediately</span>
        </label>
        <button className="button button-primary" style={{ marginTop: "1rem", width: "100%" }} disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create profile"}
        </button>
      </form>
    </main>
  );
};

export default CreateDoctorProfile;
