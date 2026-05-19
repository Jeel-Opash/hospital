import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllAppointments, fetchAllDoctors, fetchAllPatients, fetchAppointmentsPerDoctor, fetchClinicStats } from "../../api/adminApi";
import { useAuth } from "../../context/AuthContext";
import { UserMenu } from "../../components/UserMenu";

const fmt = (v) => v ? new Intl.DateTimeFormat(undefined, { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }).format(new Date(v)) : "—";
const Pager = ({ page, total, limit, onChange }) => {
  const pages = Math.ceil(total / limit) || 1;
  return (
    <div className="actions" style={{ marginTop:"0.75rem", justifyContent:"flex-end" }}>
      <button className="button button-secondary" disabled={page<=1} onClick={() => onChange(page-1)}>‹ Prev</button>
      <span className="muted" style={{ padding:"0 0.5rem", alignSelf:"center" }}>{page} / {pages}</span>
      <button className="button button-secondary" disabled={page>=pages} onClick={() => onChange(page+1)}>Next ›</button>
    </div>
  );
};

const TABS = [["overview","Overview"],["doctors","Doctors"],["patients","Patients"],["appointments","Appointments"],["per-doctor","Stats per Doctor"]];
const STATUSES = ["PENDING","CONFIRMED","COMPLETED","CANCELLED","NO_SHOW"];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [dF, setDF] = useState({ specialty:"", location:"", page:1, limit:8 });
  const [pF, setPF] = useState({ search:"", page:1, limit:8 });
  const [aF, setAF] = useState({ status:"", from:"", to:"", page:1, limit:10 });
  const [pdF, setPdF] = useState({ status:"", from:"", to:"" });

  const statsQ  = useQuery({ queryKey:["admin-stats"], queryFn: fetchClinicStats });
  const docsQ   = useQuery({ queryKey:["admin-doctors", dF], queryFn: () => fetchAllDoctors(dF) });
  const patsQ   = useQuery({ queryKey:["admin-patients", pF], queryFn: () => fetchAllPatients(pF) });
  const apptsQ  = useQuery({ queryKey:["admin-appointments", aF], queryFn: () => fetchAllAppointments(aF) });
  const pdQ     = useQuery({ queryKey:["admin-per-doctor", pdF], queryFn: () => fetchAppointmentsPerDoctor(pdF), enabled: tab==="per-doctor" });

  const s   = statsQ.data || {};
  const docs = docsQ.data?.doctors || [];
  const pats = patsQ.data?.patients || [];
  const appts = apptsQ.data?.appointments || [];
  const pd   = pdQ.data?.doctors || [];

  return (
    <main className="workspace">
      <header className="topbar">
        <div><p className="eyebrow">Clinic admin</p><h1>{user?.username || "Admin"} Dashboard</h1></div>
        <UserMenu profilePath={null} />
      </header>

      <section className="metric-row">
        {[["Doctors",s.totalDoctors??0],["Patients",s.totalPatients??0],["Today",s.todayAppointments??0],["Utilization",s.utilization??"0%"],["No-show",s.noShowRate??"0%"]].map(([l,v]) => (
          <div className="metric" key={l}><span>{l}</span><strong>{v}</strong></div>
        ))}
      </section>

      <nav className="page-tabs" style={{ maxWidth:1440, margin:"0 auto 1rem" }}>
        {TABS.map(([key,label]) => (
          <button key={key} className={`button ${tab===key?"button-primary":"button-secondary"}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      <div style={{ maxWidth:1440, margin:"0 auto" }}>
        {tab === "overview" && (
          <section className="panel">
            <div className="panel-heading"><h2>Clinic Overview</h2></div>
            <div className="form-grid">
              {[["Total Appointments",s.totalAppointments??0],["Completed",s.completedAppointments??0],["Cancelled",s.cancelledAppointments??0],["No-show Rate",s.noShowRate??"0%"]].map(([l,v]) => (
                <div className="metric" key={l}><span>{l}</span><strong>{v}</strong></div>
              ))}
            </div>
          </section>
        )}

        {tab === "doctors" && (
          <section className="panel">
            <div className="panel-heading"><h2>Doctors</h2><span className="muted">{docsQ.data?.total??0} total</span></div>
            <div className="filter-bar">
              <input placeholder="Filter by specialty" value={dF.specialty} onChange={(e) => setDF({ ...dF, specialty:e.target.value, page:1 })} />
              <input placeholder="Filter by location" value={dF.location} onChange={(e) => setDF({ ...dF, location:e.target.value, page:1 })} />
            </div>
            <div className="stack">
              {docs.map((d) => (
                <article className="record-card" key={d._id}>
                  <div>
                    <strong>Dr. {d.userId?.username || "Doctor"}</strong>
                    <p>{d.userId?.email || "—"}</p>
                    <p>{d.specialty} · {d.location}</p>
                    <p>{d.slotDurationMin} min · {d.timezone} · Fee ₹{d.consultationFee??0} · {d.experienceYears??0} yrs</p>
                    <span className={`pill ${d.isAcceptingAppointments?"success":"danger"}`}>{d.isAcceptingAppointments?"Accepting":"Paused"}</span>
                  </div>
                </article>
              ))}
              {!docsQ.isLoading && docs.length===0 && <p className="empty">No doctors match the filters.</p>}
            </div>
            <Pager page={dF.page} total={docsQ.data?.total??0} limit={dF.limit} onChange={(p) => setDF({ ...dF, page:p })} />
          </section>
        )}

        {tab === "patients" && (
          <section className="panel">
            <div className="panel-heading"><h2>Patients</h2><span className="muted">{patsQ.data?.total??0} total</span></div>
            <div className="filter-bar">
              <input placeholder="Search by name or email" value={pF.search} onChange={(e) => setPF({ ...pF, search:e.target.value, page:1 })} />
            </div>
            <div className="stack">
              {pats.map((p) => (
                <article className="record-card" key={p._id}>
                  <div><strong>{p.username}</strong><p>{p.email}</p><p>Joined {fmt(p.createdAt)}</p></div>
                </article>
              ))}
              {!patsQ.isLoading && pats.length===0 && <p className="empty">No patients found.</p>}
            </div>
            <Pager page={pF.page} total={patsQ.data?.total??0} limit={pF.limit} onChange={(p) => setPF({ ...pF, page:p })} />
          </section>
        )}

        {tab === "appointments" && (
          <section className="panel">
            <div className="panel-heading"><h2>Appointments</h2><span className="muted">{apptsQ.data?.total??0} total</span></div>
            <div className="filter-bar">
              <select value={aF.status} onChange={(e) => setAF({ ...aF, status:e.target.value, page:1 })}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" value={aF.from} onChange={(e) => setAF({ ...aF, from:e.target.value, page:1 })} />
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr>{["Booking ID","Doctor","Patient","Slot","Status","Reason"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {appts.map((a) => (
                    <tr key={a._id}>
                      <td>{a.bookingId}</td>
                      <td>{a.doctorId?.userId?.username || "Doctor"}</td>
                      <td>{a.patientId?.username || "Patient"}</td>
                      <td>{fmt(a.slotStartUTC)}</td>
                      <td><span className={`status status-${a.status.toLowerCase()}`}>{a.status}</span></td>
                      <td>{a.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!apptsQ.isLoading && appts.length===0 && <p className="empty">No appointments found.</p>}
            </div>
            <Pager page={aF.page} total={apptsQ.data?.total??0} limit={aF.limit} onChange={(p) => setAF({ ...aF, page:p })} />
          </section>
        )}

        {tab === "per-doctor" && (
          <section className="panel">
            <div className="panel-heading"><h2>Appointments per Doctor</h2><span className="muted">{pd.length} doctors</span></div>
            <div className="filter-bar">
              <select value={pdF.status} onChange={(e) => setPdF({ ...pdF, status:e.target.value })}>
                <option value="">All statuses</option>
                {STATUSES.slice(0,4).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="date" value={pdF.from} onChange={(e) => setPdF({ ...pdF, from:e.target.value })} />
            </div>
            {pdQ.data && (
              <div className="metric-row" style={{ marginBottom:"1rem" }}>
                {[["Total","total"],["Confirmed","confirmed"],["Completed","completed"],["Cancelled","cancelled"],["No-show","noShow"]].map(([l,k]) => (
                  <div className="metric" key={k}><span>{l}</span><strong>{pdQ.data.clinicSummary?.[k]??0}</strong></div>
                ))}
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead><tr>{["Doctor","Specialty","Location","Total","Confirmed","Completed","Cancelled","No-show"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {pd.map((r) => (
                    <tr key={r.doctorId}>
                      <td>{r.doctor?.name||"Doctor"}</td><td>{r.doctor?.specialty||"—"}</td><td>{r.doctor?.location||"—"}</td>
                      <td>{r.appointments?.total??0}</td><td>{r.appointments?.confirmed??0}</td>
                      <td>{r.appointments?.completed??0}</td><td>{r.appointments?.cancelled??0}</td><td>{r.appointments?.noShow??0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!pdQ.isLoading && pd.length===0 && <p className="empty">No data found.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default AdminDashboard;
