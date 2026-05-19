import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getAllDoctorAppointments,
  getDoctorDayAppointments,
  updateDoctorAppointmentStatus,
  updateDoctorNotes,
} from "../../api/doctorApi";
import DoctorShell from "./DoctorShell";
import { fmtDate, fmtTime, todayISO } from "./doctorUtils";

const PastCard = ({ appointment, timezone, small }) => (
  <article className="appointment-row past-row">
    <div className="time-block" style={small ? { fontSize: "0.78rem" } : {}}>
      {small && <>{fmtDate(appointment.slot.startUTC, timezone)}<br /></>}
      {fmtTime(appointment.slot.startUTC, timezone)}
    </div>
    <div className="appointment-body">
      <strong>{appointment.patient?.username || "Patient"}</strong>
      <p>{appointment.reason}</p>
      <span className={`status status-${appointment.status.toLowerCase()}`}>{appointment.status}</span>
      {appointment.doctorNotes && <p style={{ fontStyle: "italic", fontSize: "0.82rem" }}>{appointment.doctorNotes}</p>}
    </div>
  </article>
);

const DoctorDashboard = () => (
  <DoctorShell>
    {({ profile, timezone, invalidateDoctorData }) => <DoctorAppointments profile={profile} timezone={timezone} invalidateDoctorData={invalidateDoctorData} />}
  </DoctorShell>
);

const DoctorAppointments = ({ profile, timezone, invalidateDoctorData }) => {
  const [date, setDate] = useState(todayISO());
  const [tab, setTab] = useState("today");
  const [notes, setNotes] = useState({});

  const dayQuery = useQuery({ queryKey: ["doctor-day", date], queryFn: () => getDoctorDayAppointments(date) });
  const pastQuery = useQuery({ queryKey: ["doctor-past"], queryFn: () => getAllDoctorAppointments({ status: "COMPLETED" }), enabled: tab === "past" });
  const cancelledQuery = useQuery({ queryKey: ["doctor-cancelled"], queryFn: () => getAllDoctorAppointments({ status: "CANCELLED" }), enabled: tab === "past" });

  const dayList = useMemo(() => dayQuery.data || [], [dayQuery.data]);
  const active = useMemo(() => dayList.filter((item) => ["PENDING", "CONFIRMED"].includes(item.status)), [dayList]);
  const done = useMemo(() => dayList.filter((item) => ["COMPLETED", "CANCELLED"].includes(item.status)), [dayList]);
  const pastAll = useMemo(() => {
    const list = [...(pastQuery.data?.appointments || []), ...(cancelledQuery.data?.appointments || [])];
    return list.sort((a, b) => new Date(b.slot.startUTC) - new Date(a.slot.startUTC));
  }, [pastQuery.data, cancelledQuery.data]);
  const stats = useMemo(() => ({
    total: dayList.length,
    confirmed: dayList.filter((item) => item.status === "CONFIRMED").length,
    pending: dayList.filter((item) => item.status === "PENDING").length,
    completed: dayList.filter((item) => item.status === "COMPLETED").length,
  }), [dayList]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateDoctorAppointmentStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      invalidateDoctorData();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Status update failed"),
  });

  const notesMutation = useMutation({
    mutationFn: ({ id, value }) => updateDoctorNotes(id, value),
    onSuccess: () => {
      toast.success("Notes saved");
      invalidateDoctorData();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not save notes"),
  });

  return (
    <>
      <section className="metric-row">
        {[["Today", stats.total], ["Confirmed", stats.confirmed], ["Pending", stats.pending], ["Completed", stats.completed]].map(([label, value]) => (
          <div className="metric" key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
        <div className="metric">
          <span>Status</span>
          <strong><span className={`pill ${profile.isAcceptingAppointments ? "success" : "danger"}`}>{profile.isAcceptingAppointments ? "Accepting" : "Paused"}</span></strong>
        </div>
      </section>

      <section className="dashboard-grid single-grid">
        <section className="panel">
          <div className="appt-tabs" style={{ marginBottom: "0.75rem" }}>
            {[["today", "Today", active.length], ["past", "Past", done.length]].map(([key, label, count]) => (
              <button key={key} className={tab === key ? "appt-tab active" : "appt-tab"} onClick={() => setTab(key)}>
                {label}{count > 0 && <span className={`tab-badge${key === "past" ? " muted-badge" : ""}`}>{count}</span>}
              </button>
            ))}
            {tab === "today" && (
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)}
                style={{ marginLeft: "auto", width: "auto", padding: "0.35rem 0.6rem", fontSize: "0.85rem" }} />
            )}
          </div>

          {tab === "today" && (
            <div className="stack">
              {active.map((appointment) => (
                <article className="appointment-row" key={appointment._id}>
                  <div className="time-block">{fmtTime(appointment.slot.startUTC, timezone)}</div>
                  <div className="appointment-body">
                    <strong>{appointment.patient?.username || "Patient"}</strong>
                    <p>{appointment.reason}</p>
                    <span className={`status status-${appointment.status.toLowerCase()}`}>{appointment.status}</span>
                    <textarea
                      rows="2"
                      placeholder="Private notes"
                      value={notes[appointment._id] ?? appointment.doctorNotes ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [appointment._id]: event.target.value }))}
                    />
                    <div className="appt-actions">
                      <button className="btn-xs secondary" onClick={() => notesMutation.mutate({ id: appointment._id, value: notes[appointment._id] ?? appointment.doctorNotes ?? "" })}>Save notes</button>
                      <button className="btn-xs primary" disabled={appointment.status === "CONFIRMED"} onClick={() => statusMutation.mutate({ id: appointment._id, status: "CONFIRMED" })}>Confirm</button>
                      <button className="btn-xs success" onClick={() => statusMutation.mutate({ id: appointment._id, status: "COMPLETED" })}>Complete</button>
                      <button className="btn-xs danger" onClick={() => statusMutation.mutate({ id: appointment._id, status: "CANCELLED" })}>Cancel</button>
                    </div>
                  </div>
                </article>
              ))}
              {!dayQuery.isLoading && active.length === 0 && <p className="empty">No active appointments for this day.</p>}
            </div>
          )}

          {tab === "past" && (
            <div className="stack">
              {done.length > 0 && <><p className="muted" style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700 }}>TODAY</p>{done.map((appointment) => <PastCard key={appointment._id} appointment={appointment} timezone={timezone} />)}</>}
              {pastAll.length > 0 && <><p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", fontWeight: 700 }}>ALL PAST</p>{pastAll.map((appointment) => <PastCard key={appointment._id} appointment={appointment} timezone={timezone} small />)}</>}
              {(pastQuery.isLoading || cancelledQuery.isLoading) && <p className="empty">Loading...</p>}
              {!pastQuery.isLoading && !cancelledQuery.isLoading && done.length === 0 && pastAll.length === 0 && <p className="empty">No past appointments yet.</p>}
            </div>
          )}
        </section>
      </section>
    </>
  );
};

export default DoctorDashboard;
