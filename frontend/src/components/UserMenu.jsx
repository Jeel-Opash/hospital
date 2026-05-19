import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initial = (user?.username || "U")[0].toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button className="user-menu__trigger" onClick={() => setOpen((o) => !o)}>
        <span className="user-menu__avatar">{initial}</span>
        <span className="user-menu__name">{user?.username || "Account"}</span>
        <span className="user-menu__chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="user-menu__dropdown">
          <div className="user-menu__header">
            <span className="user-menu__avatar user-menu__avatar--lg">{initial}</span>
            <div>
              <strong>{user?.username || "User"}</strong>
              <p>{user?.email || ""}</p>
            </div>
          </div>
          <div className="user-menu__divider" />
          <button className="user-menu__item user-menu__item--danger" onClick={() => { setOpen(false); logout(); navigate("/login"); }}>
            <span>🚪</span> Logout
          </button>
        </div>
      )}
    </div>
  );
};

export const DoctorUserMenu = ({ pf, setF, saveProfile, profileMut }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setDrawer(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const initial = (user?.username || "D")[0].toUpperCase();

  const handleSave = (e) => {
    saveProfile(e);
    if (!profileMut.isPending) setDrawer(false);
  };

  return (
    <>
      <div className="user-menu" ref={ref}>
        <button className="user-menu__trigger" onClick={() => setOpen((o) => !o)}>
          <span className="user-menu__avatar">{initial}</span>
          <span className="user-menu__name">Dr. {user?.username || "Doctor"}</span>
          <span className="user-menu__chevron">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div className="user-menu__dropdown">
            <div className="user-menu__header">
              <span className="user-menu__avatar user-menu__avatar--lg">{initial}</span>
              <div>
                <strong>Dr. {user?.username || "Doctor"}</strong>
                <p>{user?.email || ""}</p>
                {pf && (
                  <span className={`pill ${pf.isAcceptingAppointments ? "success" : "danger"}`} style={{ marginTop: "0.3rem" }}>
                    {pf.isAcceptingAppointments ? "Accepting" : "Paused"}
                  </span>
                )}
              </div>
            </div>
            <div className="user-menu__divider" />
            <button className="user-menu__item" onClick={() => { setOpen(false); setDrawer(true); }}>
              <span>👤</span> Practice Profile
            </button>
            <div className="user-menu__divider" />
            <button className="user-menu__item user-menu__item--danger" onClick={() => { setOpen(false); logout(); navigate("/login"); }}>
              <span>🚪</span> Logout
            </button>
          </div>
        )}
      </div>

      {drawer && (
        <div className="drawer-backdrop" onClick={() => setDrawer(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer__header">
              <h2>Practice Profile</h2>
              <button className="drawer__close" onClick={() => setDrawer(false)}>✕</button>
            </div>

            {pf ? (
              <form className="drawer__body" onSubmit={handleSave}>
                <div className="form-grid">
                  {[
                    ["Specialty", "specialty", { required: true }],
                    ["Location", "location", { required: true }],
                    ["Timezone", "timezone", {}],
                    ["Qualifications", "qualifications", { placeholder: "MBBS, MD" }],
                    ["Experience (yrs)", "experienceYears", { type: "number", min: "0" }],
                    ["Fee (₹)", "consultationFee", { type: "number", min: "0" }],
                  ].map(([l, k, x]) => (
                    <label key={k}>
                      <span>{l}</span>
                      <input value={pf[k]} onChange={(e) => setF(k, e.target.value)} {...x} />
                    </label>
                  ))}
                  <label>
                    <span>Slot Duration</span>
                    <select value={pf.slotDurationMin} onChange={(e) => setF("slotDurationMin", e.target.value)}>
                      {[15, 20, 30, 45, 60].map((v) => <option key={v} value={v}>{v} min</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Max Patients / Slot</span>
                    <input type="number" min="1" value={pf.maxPatientsPerSlot} onChange={(e) => setF("maxPatientsPerSlot", e.target.value)} />
                  </label>
                </div>

                <label className="toggle-line" style={{ marginTop: "0.75rem" }}>
                  <input type="checkbox" checked={pf.isAcceptingAppointments} onChange={(e) => setF("isAcceptingAppointments", e.target.checked)} />
                  <span>Accept new appointments</span>
                </label>

                <div className="drawer__footer">
                  <button type="button" className="button button-secondary" onClick={() => setDrawer(false)}>Cancel</button>
                  <button type="submit" className="button button-primary" disabled={profileMut.isPending}>
                    {profileMut.isPending ? "Saving…" : "Save profile"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="muted" style={{ padding: "1rem" }}>Loading profile…</p>
            )}
          </aside>
        </div>
      )}
    </>
  );
};

export default UserMenu;
