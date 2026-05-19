import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PatientShell from "./PatientShell";
import { useInvalidatePatientData } from "./patientHooks";
import { formatSlot, getBrowserTimezone, getId } from "./patientUtils";
import { bookAppointment, joinWaitlist, searchDoctors } from "../../api/patientApi";

const today = new Date().toISOString().slice(0, 10);

const PatientDashboard = () => {
  const inv = useInvalidatePatientData();
  const tz = getBrowserTimezone();
  const [filters, setFilters] = useState({ specialty: "", location: "", date: today, n: 6 });
  const [submitted, setSubmitted] = useState(null);
  const [bookDraft, setBookDraft] = useState(null);
  const [selId, setSelId] = useState(null);
  const [searched, setSearched] = useState(false);

  const doctorsQ = useQuery({
    queryKey: ["patient-doctors", submitted],
    queryFn: () => searchDoctors(submitted),
    enabled: Boolean(submitted),
  });

  const doctors = useMemo(() => (doctorsQ.data || []).filter((d) => d && getId(d)), [doctorsQ.data]);
  const selDoc  = useMemo(() => doctors.find((d) => getId(d) === selId) || null, [doctors, selId]);

  const bookMut = useMutation({
    mutationFn: bookAppointment,
    onSuccess: (d) => { toast.success(`Booking confirmed! ID: ${d.bookingId}`); setBookDraft(null); inv(); },
    onError: (e) => toast.error(e.response?.status === 409 ? "That slot was just taken — pick another time." : e.response?.data?.message || "Booking failed"),
  });

  const waitMut = useMutation({
    mutationFn: joinWaitlist,
    onSuccess: (d) => { toast.success(`Added to waitlist at position #${d.position}`); inv(); },
    onError: (e) => toast.error(e.response?.data?.message || "Could not join waitlist"),
  });

  const submitSearch = (e) => {
    e.preventDefault();
    setSelId(null);
    setSearched(true);
    setSubmitted({ ...filters, n: Number(filters.n) || 6 });
  };

  const confirmBook = (e) => {
    e.preventDefault();
    const doctorId = getId(bookDraft?.doctor);
    if (!doctorId || !bookDraft?.slot?.slotStartUTC) { toast.error("Select a slot again."); setBookDraft(null); return; }
    const form = new FormData(e.currentTarget);
    bookMut.mutate({ doctorId, slotStartUTC: bookDraft.slot.slotStartUTC, slotEndUTC: bookDraft.slot.slotEndUTC, reason: form.get("reason"), notes: form.get("notes"), timezone: tz });
  };

  const sf = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <PatientShell title="Find Doctors" gridClass="patient-grid">

      {/* ── Search Panel ── */}
      <form className="panel search-panel" onSubmit={submitSearch}>
        <div className="panel-heading">
          <h2>Search Doctors</h2>
          <span className="pill">{tz}</span>
        </div>
        <div className="form-grid">
          <label>
            <span>Specialty</span>
            <input value={filters.specialty} onChange={sf("specialty")} placeholder="e.g. Cardiology" />
          </label>
          <label>
            <span>Location</span>
            <input value={filters.location} onChange={sf("location")} placeholder="e.g. Mumbai, Remote" />
          </label>
          <label>
            <span>From date</span>
            <input type="date" value={filters.date} onChange={sf("date")} min={today} />
          </label>
          <label>
            <span>Slots to show</span>
            <input type="number" min="1" max="20" value={filters.n} onChange={sf("n")} />
          </label>
        </div>
        <button className="button button-primary" type="submit" style={{ width: "100%" }}>
          {doctorsQ.isFetching ? "Searching…" : "Search Doctors"}
        </button>
      </form>

      <section className="panel">
        {!searched && (
          <div className="search-empty-state">
            <h3>Find your doctor</h3>
          </div>
        )}

        {searched && (
          <>
            <div className="panel-heading">
              <h2>Available Doctors</h2>
              <span className="muted">{doctorsQ.isFetching ? "Searching…" : `${doctors.length} found`}</span>
            </div>

            {doctorsQ.isFetching && (
              <div className="loading-list">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton-card" />)}
              </div>
            )}

            {doctorsQ.isError && <p className="error-text">Could not load doctors. Please try again.</p>}

            {!doctorsQ.isFetching && doctors.length === 0 && (
              <div className="search-empty-state">
                <h3>No doctors found</h3>
                <p>Try a different specialty, location, or date.</p>
              </div>
            )}

            <div className="stack">
              {doctors.map((doc) => {
                const id = getId(doc);
                const isSelected = id === selId;
                const availableSlots = (doc.nextSlots || []).filter((s) => !s.isFull).length;
                const fullSlots = (doc.nextSlots || []).filter((s) => s.isFull).length;
                return (
                  <article key={id} className={`doctor-card${isSelected ? " doctor-card--selected" : ""}`}>
                    <div className="doctor-card__avatar">
                      {(doc.userId?.username || "D")[0].toUpperCase()}
                    </div>
                    <div className="doctor-card__info">
                      <div className="doctor-card__name-row">
                        <strong>Dr. {doc.userId?.username || "Doctor"}</strong>
                        <span className="pill success">Accepting</span>
                      </div>
                      <p className="doctor-card__meta">{doc.specialty} · {doc.location}</p>
                      <p className="doctor-card__meta">{doc.slotDurationMin} min slots · ₹{doc.consultationFee ?? 0} fee · {doc.experienceYears ?? 0} yrs exp</p>
                      <div className="doctor-card__slots-row">
                        {availableSlots > 0 && <span className="slot-badge slot-badge--open">{availableSlots} open</span>}
                        {fullSlots > 0 && <span className="slot-badge slot-badge--full">{fullSlots} full</span>}
                        {availableSlots === 0 && fullSlots === 0 && <span className="slot-badge slot-badge--none">No slots</span>}
                      </div>
                    </div>
                    <button
                      className={`button ${isSelected ? "button-secondary" : "button-primary"}`}
                      onClick={() => setSelId(isSelected ? null : id)}
                    >
                      {isSelected ? "Hide slots" : "View slots"}
                    </button>
                  </article>
                );
              })}
            </div>

            {/* ── Slot Picker ── */}
            {selDoc && (
              <div className="slot-picker">
                <div className="slot-picker__header">
                  <div>
                    <h3>Dr. {selDoc.userId?.username || "Doctor"}</h3>
                    <p>{selDoc.specialty} · {selDoc.slotDurationMin} min per slot</p>
                  </div>
                  <button className="button button-secondary" style={{ fontSize: "0.82rem", padding: "0.4rem 0.7rem" }} onClick={() => setSelId(null)}>✕ Close</button>
                </div>

                {!(selDoc.nextSlots?.length) && <p className="empty">No open slots from the selected date. Try a different date.</p>}

                <div className="slot-grid">
                  {(selDoc.nextSlots || []).map((slot) => (
                    <button
                      key={`${getId(selDoc)}-${slot.slotStartUTC}`}
                      className={`slot-chip${slot.isFull ? " slot-chip--full" : " slot-chip--open"}`}
                      onClick={() => {
                        if (slot.isFull) {
                          waitMut.mutate({ doctorId: getId(selDoc), slotStartUTC: slot.slotStartUTC, slotEndUTC: slot.slotEndUTC, reason: "Patient requested waitlist", timezone: tz });
                        } else {
                          setBookDraft({ doctor: selDoc, slot });
                        }
                      }}
                      disabled={waitMut.isPending}
                      title={slot.isFull ? "Join waitlist" : "Book this slot"}
                    >
                      <span className="slot-chip__date">{slot.date}</span>
                      <span className="slot-chip__time">{slot.time}</span>
                      <span className="slot-chip__label">{slot.isFull ? "Waitlist" : "Book"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Booking Modal ── */}
      {bookDraft?.doctor && bookDraft?.slot && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={confirmBook}>
            <div className="booking-modal__header">
              <div className="booking-modal__avatar">
                {(bookDraft.doctor.userId?.username || "D")[0].toUpperCase()}
              </div>
              <div>
                <h2>Confirm Appointment</h2>
                <p>Dr. {bookDraft.doctor.userId?.username || "Doctor"} · {bookDraft.doctor.specialty}</p>
              </div>
            </div>

            <div className="booking-modal__slot">
              <span>📅</span>
              <span>{formatSlot(bookDraft.slot.slotStartUTC, tz)}</span>
              <span className="muted">({bookDraft.doctor.slotDurationMin} min · ₹{bookDraft.doctor.consultationFee ?? 0})</span>
            </div>

            <label>
              <span>Reason for visit *</span>
              <textarea name="reason" required maxLength="500" rows="3" placeholder="Briefly describe your concern or symptoms…" />
            </label>
            <label>
              <span>Additional notes</span>
              <textarea name="notes" maxLength="2000" rows="2" placeholder="Any reports, allergies, or preferences (optional)" />
            </label>

            <div className="actions">
              <button type="button" className="button button-secondary" onClick={() => setBookDraft(null)}>Cancel</button>
              <button className="button button-primary" disabled={bookMut.isPending} style={{ flex: 1 }}>
                {bookMut.isPending ? "Booking…" : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      )}
    </PatientShell>
  );
};

export default PatientDashboard;
