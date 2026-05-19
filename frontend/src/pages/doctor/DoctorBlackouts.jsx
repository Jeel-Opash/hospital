/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getAllDoctorAppointments, updateBlackoutDates } from "../../api/doctorApi";
import DoctorShell from "./DoctorShell";
import { fmtTime } from "./doctorUtils";

const DoctorBlackouts = () => (
  <DoctorShell>
    {({ profile, timezone, invalidateDoctorData }) => <BlackoutsPage profile={profile} timezone={timezone} invalidateDoctorData={invalidateDoctorData} />}
  </DoctorShell>
);

const BlackoutsPage = ({ profile, timezone, invalidateDoctorData }) => {
  const [blackouts, setBlackouts] = useState("");
  const recentQuery = useQuery({ queryKey: ["doctor-appointments"], queryFn: () => getAllDoctorAppointments({}) });

  useEffect(() => {
    setBlackouts((profile.blackoutDates || []).join(", "));
  }, [profile]);

  const mutation = useMutation({
    mutationFn: updateBlackoutDates,
    onSuccess: () => {
      toast.success("Blackout dates saved");
      invalidateDoctorData();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save blackout dates"),
  });

  const save = () => mutation.mutate(blackouts.split(",").map((date) => date.trim()).filter(Boolean));

  return (
    <section className="dashboard-grid single-grid">
      <section className="panel">
        <div className="panel-heading">
          <h2>Blackout Dates</h2>
          <button className="button button-primary" onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
        <label>
          <span>Comma-separated YYYY-MM-DD</span>
          <textarea rows="3" value={blackouts} onChange={(event) => setBlackouts(event.target.value)} placeholder="2026-05-22, 2026-06-01" />
        </label>
        <div className="panel-heading" style={{ marginTop: "1rem" }}>
          <h2>Recent Appointments</h2>
        </div>
        <div className="stack compact">
          {(recentQuery.data?.appointments || []).slice(0, 6).map((appointment) => (
            <article className="record-card" key={appointment._id}>
              <div>
                <strong>{appointment.bookingId}</strong>
                <p>{appointment.patient?.username || "Patient"} - {appointment.status}</p>
              </div>
              <span className="muted">{fmtTime(appointment.slot.startUTC, timezone)}</span>
            </article>
          ))}
          {!recentQuery.isLoading && (recentQuery.data?.appointments || []).length === 0 && <p className="empty">No appointments yet.</p>}
        </div>
      </section>
    </section>
  );
};

export default DoctorBlackouts;
