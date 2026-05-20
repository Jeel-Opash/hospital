import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getAllDoctorAppointments, updateBlackoutDates } from "../../api/doctorApi";
import DoctorShell from "./DoctorShell";
import { fmtTime, TimePicker, fmt12 } from "./doctorUtils.jsx";

const DoctorBlackouts = () => (
  <DoctorShell>
    {({ profile, timezone, invalidateDoctorData }) => (
      <BlackoutsPage profile={profile} timezone={timezone} invalidateDoctorData={invalidateDoctorData} />
    )}
  </DoctorShell>
);

const EMPTY = { date: "", useTime: false, startTime: "09:00", endTime: "17:00" };

const BlackoutsPage = ({ profile, timezone, invalidateDoctorData }) => {
  const [entries, setEntries] = useState(() =>
    (profile.blackoutDates || []).map((b) => ({
      date: b.date,
      useTime: Boolean(b.startTime),
      startTime: b.startTime ?? "09:00",
      endTime: b.endTime ?? "17:00",
    })),
  );
  const [form, setForm] = useState({ ...EMPTY });

  const recentQuery = useQuery({ queryKey: ["doctor-appointments"], queryFn: () => getAllDoctorAppointments({}) });

  const mutation = useMutation({
    mutationFn: updateBlackoutDates,
    onSuccess: () => { toast.success("Blackout dates saved"); invalidateDoctorData(); },
    onError: (e) => toast.error(e.response?.data?.message || "Could not save"),
  });

  const add = () => {
    if (!form.date) return toast.error("Date is required");
    if (form.useTime && form.startTime >= form.endTime)
      return toast.error("End time must be after start time");
    setEntries((prev) => [...prev, { ...form }]);
    setForm({ ...EMPTY });
  };

  const remove = (i) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  const save = () =>
    mutation.mutate(
      entries.map((e) => ({ date: e.date, ...(e.useTime ? { startTime: e.startTime, endTime: e.endTime } : {}) })),
    );

  return (
    <section className="dashboard-grid single-grid">
      <section className="panel">
        <div className="panel-heading">
          <h2>Blackout Dates</h2>
          <button className="button button-primary" onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="form-grid" style={{ gridTemplateColumns: "1fr auto", alignItems: "flex-end", marginBottom: "0.5rem" }}>
          <label>
            <span>Date</span>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </label>
          <label className="toggle-line" style={{ paddingBottom: "0.72rem" }}>
            <input type="checkbox" checked={form.useTime} onChange={(e) => setForm((f) => ({ ...f, useTime: e.target.checked }))} />
            <span>Specific time range</span>
          </label>
        </div>
        {form.useTime && (
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "flex-end", marginBottom: "0.5rem" }}>
            <label>
              <span>Start time</span>
              <TimePicker value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
            </label>
            <label>
              <span>End time</span>
              <TimePicker value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
            </label>
          </div>
        )}
        <button className="button button-secondary" onClick={add} style={{ marginBottom: "0.9rem" }}>
          + Add
        </button>

        <div className="stack compact">
          {entries.length === 0 && <p className="empty">No blackout entries yet.</p>}
          {entries.map((e, i) => (
            <article className="record-card" key={i}>
              <div>
                <strong>{e.date}</strong>
                <p>{e.useTime ? `${fmt12(e.startTime)} – ${fmt12(e.endTime)}` : "Full day"}</p>
              </div>
              <button className="btn-xs danger" onClick={() => remove(i)}>Remove</button>
            </article>
          ))}
        </div>

        <div className="panel-heading" style={{ marginTop: "1.5rem" }}>
          <h2>Recent Appointments</h2>
        </div>
        <div className="stack compact">
          {(recentQuery.data?.appointments || []).slice(0, 6).map((a) => (
            <article className="record-card" key={a._id}>
              <div>
                <strong>{a.bookingId}</strong>
                <p>{a.patient?.username || "Patient"} — {a.status}</p>
              </div>
              <span className="muted">{fmtTime(a.slot.startUTC, timezone)}</span>
            </article>
          ))}
          {!recentQuery.isLoading && (recentQuery.data?.appointments || []).length === 0 && (
            <p className="empty">No appointments yet.</p>
          )}
        </div>
      </section>
    </section>
  );
};

export default DoctorBlackouts;
