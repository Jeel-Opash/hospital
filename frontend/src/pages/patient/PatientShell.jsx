import PatientNav from "./PatientNav";

const PatientShell = ({ title, gridClass = "single-grid", children }) => (
  <main className="workspace">
    <PatientNav title={title} />
    <section className={`dashboard-grid ${gridClass}`}>
      {children}
    </section>
  </main>
);

export default PatientShell;
