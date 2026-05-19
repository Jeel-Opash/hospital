import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserMenu } from "../../components/UserMenu";

const PatientNav = ({ title = "Patient portal" }) => {
  const { user } = useAuth();

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Patient portal</p>
          <h1>{title}, {user?.username || "Patient"}</h1>
        </div>
        <UserMenu profilePath={null} />
      </header>
      <nav className="page-tabs">
        <NavLink to="/patient" end>Find Doctors</NavLink>
        <NavLink to="/patient/appointments">My Appointments</NavLink>
        <NavLink to="/patient/waitlist">Waitlist</NavLink>
      </nav>
    </>
  );
};

export default PatientNav;
