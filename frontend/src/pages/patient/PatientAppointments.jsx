import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PatientShell from "./PatientShell";
import { useInvalidatePatientData } from "./patientHooks";
import { addMinutes, formatSlot, getBrowserTimezone, getId } from "./patientUtils";
import { cancelAppointment, getPatientAppointments, rescheduleAppointment } from "../../api/patientApi";

const UPCOMING = ["PENDING", "CONFIRMED"];
const PAST     = ["COMPLETED", "CANCELLED", "NO_SHOW"];

const fmtPart = (v, tz, opts) =>
  new Intl.DateTimeFormat(undefined, { ...opts, timeZone: tz }).format(new Date(v));

const statusCls = (s) =>
  `status${s === "CONFIRMED" ? " status-confirmed" : s === "COMPLETED" ? " status-completed" : s === "PENDING" ? " status-pending" : s === "CANCELLED" ? " status-cancelled" : ""}`;

const statusIcon = (s) =>
  s === "COMPLETED" ? "✓" : s === "CANCELLED" ? "✗" : s === "CONFIRMED" ? "●" : "○";

const PatientAppointments = () => {
  const inv = useInvalidatePatientData();
  const tz  = getBrowserTimezone();
  const [tab, setTab]   = useState("upcoming");
  const [draft, setDraft] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ["patient-appointments"], queryFn: getPatientAppointments });
  const all      = useMemo(() => data || [], [data]);
  const upcoming = useMemo(() => all.filter((a) => UPCOMING.includes(a.status)).sort((a, b) => new Date(a.slot.startUTC) - new Date(b.slot.startUTC)), [all]);
  const past     = useMemo(() => all.filter((a) => PAST.includes(a.status)).sort((a, b) => new Date(b.slot.startUTC) - new Date(a.slot.startUTC)), [all]);
  const list     = tab === "upcoming" ? upcoming : past;

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }) => cancelAppointment(id, reason),
    onSuccess: () => { toast.success("Appointment cancelled"); inv(); },
    onError: (e) => toast.error(e.response?.data?.message || "Cancellation failed"),
  });

  const rescheduleMut = useMutation({
    mutationFn: ({ id, payload }) => rescheduleAppointment(id, payload),
    onSuccess: (d) => { toast.success(`Rescheduled — new ID: ${d.bookingId}`); setDraft(null); inv(); },
    onError: (e) => toast.error(e.response?.data?.message || "Reschedule failed"),
  });

  const submitReschedule = (e) => {
    e.preventDefault();
    const id = getId(draft);
    if (!id) { toast.error("Select an appointment again."); setDraft(null); return; }
    const start = new Date(new FormData(e.currentTarget).get("slotStart")).toISOString();
    rescheduleMut.mutate({ id, payload: { newSlotStartUTC: start, newSlotEndUTC: addMinutes(start, draft.doctor?.slotDurationMin || 30), timezone: tz } });
  };

  return (
    <PatientShell title="My Appointments">
      <section className="panel" style={{ gridColumn: "1 / -1" }}>

        <div className="appt-tabs">
          {[["upcoming", "Upcoming", upcoming.length, ""], ["past", "Past", past.length, " muted-badge"]].map(([key, label, count, cls]) => (
            <button key={key} className={tab === key ? "appt-tab active" : "appt-tab"} onClick={() => setTab(key)}>
              {label}
              {count > 0 && <span className={`tab-badge${cls}`}>{count}</span>}
            </button>
          ))}
          <span className="muted" style={{ marginLeft: "auto", fontSize: "0.82rem", alignSelf: "center" }}>
            {tab === "upcoming" ? "  4-hour cancellation rule applies" : "Read-only history"}
          </span>
        </div>

        {isLoading && (
          <div className="loading-list" style={{ marginTop: "1rem" }}>
            {[1, 2].map((i) => <div key={i} className="skeleton-card" />)}
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="search-empty-state" style={{ marginTop: "1.5rem" }}>
            <div className="search-empty-icon">{tab === "upcoming" ? "📅" : "🗂️"}</div>
            <h3>{tab === "upcoming" ? "No upcoming appointments" : "No past appointments"}</h3>
            <p>{tab === "upcoming" ? "Book a slot from the Find Doctors page." : "Your completed and cancelled appointments will appear here."}</p>
          </div>
        )}

        <div className="stack" style={{ marginTop: "1rem" }}>
          {list.map((a) => (
            <article className="appt-card" key={getId(a)}>
              <div className={`appt-date-block${["CANCELLED","COMPLETED","NO_SHOW"].includes(a.status) ? " appt-date-block--dim" : ""}`}>
                <span className="appt-date-day">{fmtPart(a.slot.startUTC, tz, { day: "numeric" })}</span>
                <span className="appt-date-mon">{fmtPart(a.slot.startUTC, tz, { month: "short" })}</span>
                <span className="appt-date-time">{fmtPart(a.slot.startUTC, tz, { hour: "numeric", minute: "2-digit" })}</span>
              </div>

              <div className="appt-info">
                <div className="appt-info-top">
                  <strong>{a.bookingId}</strong>
                  <span className={statusCls(a.status)}>
                    {statusIcon(a.status)} {a.status}
                  </span>
                </div>
                
               
                {tab === "past" && a.status === "CANCELLED" && a.cancellationReason && (
                  <p className="appt-cancel-reason">↳ {a.cancellationReason}</p>
                )}
              </div>

              {tab === "upcoming" ? (
                <div className="appt-card-actions">
                  <button className="button button-secondary" onClick={() => setDraft(a)}>Reschedule</button>
                  <button className="button button-danger" disabled={cancelMut.isPending} onClick={() => cancelMut.mutate({ id: getId(a), reason: "Cancelled by patient" })}>Cancel</button>
                </div>
              ) : (
                <div className="appt-card-actions">
                  <span className={`past-status-badge ${a.status.toLowerCase()}`}>
                    {statusIcon(a.status)} {a.status === "COMPLETED" ? "Done" : a.status === "CANCELLED" ? "Cancelled" : "No-show"}
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {draft && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitReschedule}>
            <div className="panel-heading">
              <h2>Reschedule Appointment</h2>
              <span className="muted">{draft.bookingId}</span>
            </div>
            <div className="booking-modal__slot">
              <span>📅</span>
              <span>Current: {formatSlot(draft.slot.startUTC, tz)}</span>
            </div>
            <label>
              <span>New date &amp; time (your local time)</span>
              <input name="slotStart" type="datetime-local" required />
            </label>
            <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
               The new slot must fit within the doctor's availability window.
            </p>
            <div className="actions">
              <button type="button" className="button button-secondary" onClick={() => setDraft(null)}>Cancel</button>
              <button className="button button-primary" disabled={rescheduleMut.isPending} style={{ flex: 1 }}>
                {rescheduleMut.isPending ? "Rescheduling…" : "Confirm Reschedule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </PatientShell>
  );
};

export default PatientAppointments;
