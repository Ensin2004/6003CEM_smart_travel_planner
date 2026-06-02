import './UserDashboard.css';

function UserDashboard() {
  return (
    <section className="dashboard-page">
      <h2>Dashboard</h2>
      <div className="grid">
        <article className="panel">Upcoming trips</article>
        <article className="panel">Weather preview</article>
        <article className="panel">Travel statistics</article>
      </div>
    </section>
  );
}

export default UserDashboard;
