import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PatientShell from "./PatientShell";
import { useInvalidatePatientData } from "./patientHooks";
import { getBrowserTimezone } from "./patientUtils";
import { getMyWaitlist, leaveWaitlist } from "../../api/patientApi";

const PatientWaitlist = () => {
  const inv = useInvalidatePatientData();
  const tz  = getBrowserTimezone();

  const { data, isLoading } = useQuery({
    queryKey: ["patient-waitlist", tz],
    queryFn: () => getMyWaitlist(tz),
  });

  const leaveMut = useMutation({
    mutationFn: leaveWaitlist,
    onSuccess: () => { toast.success("Removed from waitlist"); inv(); },
    onError: (e) => toast.error(e.response?.data?.message || "Could not leave waitlist"),
  });

  const list = data || [];

  return (
    <PatientShell title="Waitlist">
      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-heading">
          <div>
            <h2>My Waitlist</h2>
          </div>
          <span className={`pill ${list.length > 0 ? "" : "danger"}`}>
            {list.length} active
          </span>
        </div>

        {isLoading && (
          <div className="loading-list">
            {[1, 2].map((i) => <div key={i} className="skeleton-card" />)}
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="search-empty-state">
            <div className="search-empty-icon">🕐</div>
            <h3>No waitlist entries</h3>
                      </div>
        )}

        <div className="stack">
          {list.map((e) => (
            <article className="waitlist-card" key={e.waitlistId}>
              <div className="waitlist-position">
                <span className="waitlist-position__num">#{e.position}</span>
                <span className="waitlist-position__label">in queue</span>
              </div>

              <div className="waitlist-info">
                <div className="waitlist-info__top">
                  <strong>{e.waitlistId}</strong>
                  <span className={`pill ${e.status === "NOTIFIED" ? "success" : ""}`}>
                    {e.status}
                  </span>
                </div>
                <p className="waitlist-doctor">
                  Dr. {e.doctor?.name || "Doctor"}
                  {e.doctor?.specialty ? ` · ${e.doctor.specialty}` : ""}
                  {e.doctor?.location ? ` · ${e.doctor.location}` : ""}
                </p>
                <p className="waitlist-slot">📅 {e.slot.displayStart}</p>
                {e.status === "NOTIFIED" && (
                  <p className="waitlist-notified">🔔 You've been notified — confirm soon before your window expires.</p>
                )}
              </div>

              <button
                className="button button-danger"
                style={{ fontSize: "0.82rem", padding: "0.45rem 0.8rem", alignSelf: "center" }}
                disabled={leaveMut.isPending}
                onClick={() => leaveMut.mutate(e.waitlistId)}>
                Leave
              </button>
            </article>
          ))}
        </div>
      </section>
    </PatientShell>
  );
};

export default PatientWaitlist;
