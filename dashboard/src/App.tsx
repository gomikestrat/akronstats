import { useAnalytics } from "./hooks/useAnalytics";
import { MetricGrid } from "./components/MetricCard";
import { ZoneSelector } from "./components/ZoneSelector";
import { TimeRangeSelector } from "./components/TimeRangeSelector";
import { TrafficChart } from "./components/TrafficChart";
import { TopCountries, StatusOverview } from "./components/StatusBar";
import { SourceSelector } from "./components/SourceSelector";
import { BarChart3, RefreshCw } from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { ThemeToggle } from "./components/ThemeToggle";


function App() {
  const {
    zones,
    selectedZoneId,
    favoriteZoneIds,
    timeRange,
    analytics,
    source,
    loading,
    zonesLoading,
    error,
    selectZone,
    toggleFavorite,
    changeTimeRange,
    toggleSource,
  } = useAnalytics();

  const { theme, toggleTheme } = useTheme();


  const favoriteZonesList = zones.filter((z) => favoriteZoneIds.includes(z.id));

  return (
    <div className="app">
      {/* Animated background blobs */}
      <div className="bg-blob bg-blob--1" />
      <div className="bg-blob bg-blob--2" />
      <div className="bg-blob bg-blob--3" />

      {/* Header */}
      <header className="header">
        <div className="header__brand">
          <BarChart3 size={26} className="header__logo" />
          <h1 className="header__title">AkronStats</h1>
        </div>
        <div className="header__controls">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <SourceSelector value={source} onChange={toggleSource} />
          <TimeRangeSelector value={timeRange} onChange={changeTimeRange} />
          {loading && (
            <div className="header__loading">
              <RefreshCw size={16} className="spin" />
            </div>
          )}
        </div>

      </header>

      {/* Favorites Bar */}
      {favoriteZonesList.length > 0 && (
        <div className="favorites-bar">
          <div className="favorites-list">
            {favoriteZonesList.map((z) => (
              <button
                key={z.id}
                className={`favorite-btn ${z.id === selectedZoneId ? "favorite-btn--active" : ""}`}
                onClick={() => selectZone(z.id)}
              >
                {z.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <ZoneSelector
            zones={zones}
            selectedZoneId={selectedZoneId}
            favoriteZoneIds={favoriteZoneIds}
            onSelect={selectZone}
            onToggleFavorite={toggleFavorite}
            loading={zonesLoading}
          />
        </aside>

        {/* Content */}
        <main className="content">
          {error && (
            <div className="glass-card error-card">
              <p>{error}</p>
            </div>
          )}

          {!analytics && loading && (
            <div className="glass-card empty-state">
              <RefreshCw size={36} className="spin" style={{ opacity: 0.5 }} />
              <h2>Loading analytics…</h2>
            </div>
          )}

          {!analytics && !loading && !error && (
            <div className="glass-card empty-state">
              <BarChart3 size={48} className="empty-state__icon" />
              <h2>Select a domain to view analytics</h2>
              <p>Choose a domain from your favorites or the sidebar to get started.</p>
            </div>
          )}

          {analytics && (
            <>
              {/* Metric Cards */}
              <MetricGrid
                visits={analytics.totals.visits}
                uniques={analytics.totals.uniques}
                pageViews={analytics.totals.pageViews}
                bytes={analytics.totals.bytes}
                threats={analytics.totals.threats}
                requests={analytics.totals.requests}
                source={source}
              />

              {/* Traffic Chart */}
              {analytics.timeseries.length > 0 && (
                <TrafficChart data={analytics.timeseries} timeRange={timeRange} theme={theme} source={source} />
              )}


              {/* Bottom Panels */}
              <div className="panels-row">
                <TopCountries countries={analytics.topCountries} source={source} />
                <StatusOverview statusCodes={analytics.statusCodes} source={source} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
