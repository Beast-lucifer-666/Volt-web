import React, { useState } from 'react';
import { BoltIcon, AlertIcon, SpeakerIcon } from './Icons';
import { playAlertChime } from '../utils/audio';

export default function AlertsTab({
  live,
  soundEnabled,
  onToggleSound,
  onKillAll,
  onNavigateTab
}) {
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestNotification = async () => {
    if (typeof Notification !== 'undefined') {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        new Notification('⚡ Volt Alerts Enabled', {
          body: 'You will receive notifications for critical electrical voltage drops & surges.'
        });
      }
    }
  };

  // Generate dynamic live alerts based on current electrical conditions
  const alerts = [];

  // Low Voltage Dip (< 100V)
  if (live.voltage > 5 && live.voltage < 100) {
    alerts.push({
      id: 'crit-low-volt',
      type: 'critical',
      title: 'Critical Low Voltage Dip',
      msg: `Grid voltage has dropped to ${live.voltage.toFixed(1)}V! High risk of brownout motor burnout for refrigeration and compressor appliances.`,
      time: 'Just now',
      actionText: 'Kill All',
      action: onKillAll
    });
  }

  // High Voltage Surge (> 250V)
  if (live.voltage > 250) {
    alerts.push({
      id: 'warn-surge',
      type: 'warning',
      title: 'High Voltage Surge Detected',
      msg: `Grid voltage reached ${live.voltage.toFixed(1)}V (standard is 230V ± 10%). Monitor delicate electronics.`,
      time: 'Just now',
      actionText: 'Inspect Relays',
      action: () => onNavigateTab('relays')
    });
  }

  // Overcurrent (> 15A)
  if (live.current > 15) {
    alerts.push({
      id: 'warn-overcurrent',
      type: 'warning',
      title: 'High Amperage Load Warning',
      msg: `Line current is drawing ${live.current.toFixed(2)}A. Exceeds recommended standard 15A branch circuit threshold.`,
      time: 'Just now',
      actionText: 'Kill All',
      action: onKillAll
    });
  }

  // High Temperature (> 45°C)
  if (live.temp > 45) {
    alerts.push({
      id: 'warn-temp',
      type: 'warning',
      title: 'Thermal Warning: High Enclosure Temp',
      msg: `Sensor enclosure temperature is ${live.temp.toFixed(1)}°C. Ensure sufficient airflow around smart meter.`,
      time: 'Just now',
      actionText: 'Details',
      action: () => onNavigateTab('analytics')
    });
  }

  // Low Power Factor (< 0.85)
  if (live.pf > 0 && live.pf < 0.85 && live.power > 50) {
    alerts.push({
      id: 'info-pf',
      type: 'info',
      title: 'Sub-Optimal Power Factor',
      msg: `Power factor is ${live.pf.toFixed(2)}. Inductive loads are causing reactive power loss.`,
      time: 'Active',
      actionText: 'View Analytics',
      action: () => onNavigateTab('analytics')
    });
  }

  // Always include safe / operational alert if no criticals
  if (alerts.length === 0) {
    alerts.push({
      id: 'info-normal',
      type: 'info',
      title: 'All Circuits Normal & Protected',
      msg: `Telemetry is steady at ${live.voltage.toFixed(1)}V, ${live.current.toFixed(2)}A, and ${live.frequency.toFixed(2)}Hz. No brownouts or surges detected.`,
      time: 'Continuous',
      actionText: 'Run Diagnostics',
      action: () => playAlertChime('warning')
    });
  }

  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const totalNeedsAttention = criticalCount + warningCount;

  return (
    <div className="alerts-tab-content">
      <div className="top-header">
        <div>
          <span className="header-tag">
            <AlertIcon size={16} /> ELECTRICAL SAFETY MONITOR
          </span>
          <h1 className="header-title">Alerts & Protection</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {totalNeedsAttention > 0
              ? `${totalNeedsAttention} safety alerts require your attention`
              : 'All electrical systems operating safely within tolerances'}
          </p>
        </div>

        <div className="header-actions">
          <button
            className={`header-btn ${soundEnabled ? 'secondary' : 'secondary'}`}
            onClick={onToggleSound}
            style={{ color: soundEnabled ? 'var(--volt-teal)' : 'var(--text-muted)' }}
          >
            <SpeakerIcon size={16} />
            {soundEnabled ? 'Chime ON' : 'Chime Muted'}
          </button>

          {notificationPermission !== 'granted' && (
            <button className="header-btn secondary" onClick={requestNotification}>
              🔔 Enable Notifications
            </button>
          )}
        </div>
      </div>

      {/* Environmental & Health Summary Cards */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <span className="metric-title">Voltage Status</span>
          <div className="metric-value accent-teal">{live.voltage.toFixed(1)} V</div>
          <span className={`status-pill ${live.voltage < 100 ? 'critical' : live.voltage > 250 ? 'warning' : 'safe'}`}>
            {live.voltage < 100 ? 'CRITICAL DIP' : live.voltage > 250 ? 'HIGH SURGE' : 'SAFE'}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Current Stability</span>
          <div className="metric-value accent-blue">{live.current.toFixed(2)} A</div>
          <span className={`status-pill ${live.current > 15 ? 'warning' : 'safe'}`}>
            {live.current > 15 ? 'OVERLOAD' : 'NORMAL'}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Enclosure Temp</span>
          <div className="metric-value">{live.temp.toFixed(1)}°C</div>
          <span className={`status-pill ${live.temp > 45 ? 'warning' : 'safe'}`}>
            {live.temp > 45 ? 'HIGH' : 'OPTIMAL'}
          </span>
        </div>

        <div className="metric-card">
          <span className="metric-title">Ambient Humidity</span>
          <div className="metric-value accent-green">{live.hum}%</div>
          <span className="status-pill safe">NORMAL</span>
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-list">
        {alerts.map((alert) => (
          <div key={alert.id} className={`alert-item-card ${alert.type}`}>
            <div className="alert-icon-box">
              {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : '🛡️'}
            </div>

            <div className="alert-content">
              <div className="alert-title-row">
                <span className="alert-title">{alert.title}</span>
                <span className="alert-time">{alert.time}</span>
              </div>
              <p className="alert-desc">{alert.msg}</p>

              {alert.actionText && (
                <button className="alert-action-btn" onClick={alert.action}>
                  {alert.actionText} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
