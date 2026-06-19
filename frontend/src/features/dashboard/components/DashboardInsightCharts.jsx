function DonutChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);
  let offset = 25;

  return (
    <svg className="insight-donut" viewBox="0 0 42 42" aria-hidden="true">
      <circle className="insight-donut-track" cx="21" cy="21" r="15.9" />
      {rows.map((row) => {
        const length = total ? (Number(row.value || 0) / total) * 100 : 0;
        const segment = (
          <circle
            className="insight-donut-segment"
            cx="21"
            cy="21"
            key={row.label}
            r="15.9"
            stroke={row.color}
            strokeDasharray={`${length} ${100 - length}`}
            strokeDashoffset={offset}
          />
        );
        offset -= length;
        return segment;
      })}
    </svg>
  );
}

function Legend({ rows }) {
  return (
    <div className="insight-legend">
      {rows.map((row) => (
        <span key={row.label}>
          <em style={{ background: row.color }} />
          {row.label}
          <strong>{row.value}</strong>
        </span>
      ))}
    </div>
  );
}

function DashboardDonutCard({ detail, rows, title }) {
  const total = rows.reduce((sum, row) => sum + Number(row.value || 0), 0);

  return (
    <article className="dashboard-card insight-card insight-donut-card">
      <div className="dashboard-card-heading">
        <h3>{title}</h3>
        {detail ? <small>{detail}</small> : null}
      </div>
      <div className="insight-donut-layout">
        <DonutChart rows={rows} />
        <strong>{total}<span>Total</span></strong>
      </div>
      <Legend rows={rows} />
    </article>
  );
}

function DashboardBarCard({ detail, labels, rows, title }) {
  const maxValue = Math.max(...rows, 1);

  return (
    <article className="dashboard-card insight-card">
      <div className="dashboard-card-heading">
        <h3>{title}</h3>
        {detail ? <small>{detail}</small> : null}
      </div>
      <div className="insight-bar-chart">
        {rows.map((value, index) => (
          <span key={labels[index]}>
            <em style={{ height: `${value ? Math.max(8, (value / maxValue) * 100) : 3}%` }} />
            <small>{labels[index]}</small>
          </span>
        ))}
      </div>
    </article>
  );
}

function DashboardRankedBarCard({ detail, emptyText = 'No data yet.', rows, title }) {
  const maxValue = Math.max(...rows.map((row) => Number(row.value || 0)), 1);

  return (
    <article className="dashboard-card insight-card">
      <div className="dashboard-card-heading">
        <h3>{title}</h3>
        {detail ? <small>{detail}</small> : null}
      </div>
      <div className="insight-ranked-bars">
        {rows.length ? rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}<strong>{row.value}</strong></span>
            <div><em style={{ width: `${(Number(row.value || 0) / maxValue) * 100}%`, background: row.color }} /></div>
          </div>
        )) : <p className="dashboard-muted">{emptyText}</p>}
      </div>
    </article>
  );
}

function DashboardOverviewCharts({ chartData, monthlyTripCounts }) {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <section className="dashboard-insight-grid compact">
      <DashboardDonutCard
        detail="Active, upcoming, and completed trips"
        rows={chartData.tripStatusRows}
        title="Trip Status"
      />
      <DashboardBarCard
        detail="Trips by month in the selected year"
        labels={labels}
        rows={monthlyTripCounts}
        title="Trip Timeline"
      />
      <DashboardBarCard
        detail="Visits logged by month"
        labels={labels}
        rows={chartData.monthlyVisitCounts}
        title="Visit Activity"
      />
    </section>
  );
}

function DashboardPlaceCharts({ chartData, visitTypeRows }) {
  return (
    <section className="dashboard-insight-grid">
      <DashboardDonutCard
        detail="Visited, planned, and saved place balance"
        rows={chartData.planningRows}
        title="Place Portfolio"
      />
      <DashboardRankedBarCard
        detail="Most repeated visits"
        rows={chartData.topPlaceRows}
        title="Top Places"
      />
      <DashboardRankedBarCard
        detail="Where visited places come from"
        rows={chartData.placeSourceRows}
        title="Place Sources"
      />
      <DashboardRankedBarCard
        detail="Category count by visit volume"
        rows={visitTypeRows}
        title="Category Depth"
      />
    </section>
  );
}

export {
  DashboardBarCard,
  DashboardDonutCard,
  DashboardOverviewCharts,
  DashboardPlaceCharts,
  DashboardRankedBarCard,
};
