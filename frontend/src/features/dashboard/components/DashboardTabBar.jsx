import { BarChart3, LayoutDashboard, MapPinned } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'places', label: 'Places', icon: MapPinned },
];

function DashboardTabBar({ activeTab, onTabChange }) {
  return (
    <nav className="dashboard-tabbar" aria-label="Dashboard sections">
      {tabs.map((tab) => {
        const TabIcon = tab.icon;
        return (
          <button
            className={activeTab === tab.id ? 'active' : ''}
            type="button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            <TabIcon size={16} aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export default DashboardTabBar;
