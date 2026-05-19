/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateWeeklyAvailability } from "../../api/doctorApi";
import DoctorShell from "./DoctorShell";
import { DAYS, DEF_AVAIL } from "./doctorUtils";

const DoctorAvailability = () => (
  <DoctorShell>
    {({ profile, invalidateDoctorData }) => <AvailabilityPage profile={profile} invalidateDoctorData={invalidateDoctorData} />}
  </DoctorShell>
);

const AvailabilityPage = ({ profile, invalidateDoctorData }) => {
  const [availability, setAvailability] = useState(DEF_AVAIL);

  useEffect(() => {
    setAvailability({ ...DEF_AVAIL, ...(profile.weeklyAvailability || {}) });
  }, [profile]);

  const mutation = useMutation({
    mutationFn: updateWeeklyAvailability,
    onSuccess: () => {
      toast.success("Availability updated");
      invalidateDoctorData();
    },
    onError: (error) => toast.error(error.response?.data?.message || "Could not update availability"),
  });

  const toggleDay = (day) => setAvailability((current) => ({
    ...current,
    [day]: current[day]?.length ? [] : [{ start: "09:00", end: "17:00" }],
  }));

  const updateWindow = (day, key, value) => setAvailability((current) => ({
    ...current,
    [day]: [{ ...(current[day]?.[0] || { start: "09:00", end: "17:00" }), [key]: value }],
  }));

  return (
    <section className="dashboard-grid single-grid">
      <section className="panel">
        <div className="panel-heading">
          <h2>Weekly Availability</h2>
          <button className="button button-primary" onClick={() => mutation.mutate(availability)} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save rules"}
          </button>
        </div>
        <div className="availability-list">
          {DAYS.map((day) => {
            const enabled = Boolean(availability[day]?.length);
            const window = availability[day]?.[0] || { start: "09:00", end: "17:00" };
            return (
              <div className="availability-row" key={day}>
                <label className="toggle-line">
                  <input type="checkbox" checked={enabled} onChange={() => toggleDay(day)} />
                  <span>{day}</span>
                </label>
                <input type="time" disabled={!enabled} value={window.start} onChange={(event) => updateWindow(day, "start", event.target.value)} />
                <input type="time" disabled={!enabled} value={window.end} onChange={(event) => updateWindow(day, "end", event.target.value)} />
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
};

export default DoctorAvailability;
