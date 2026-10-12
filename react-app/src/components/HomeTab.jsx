import React, { useEffect, useRef } from 'react';
import { BoltIcon, AcIcon, FridgeIcon, LightIcon, LaptopIcon, ChargerIcon, WasherIcon } from './Icons';

export default function HomeTab({
  live,
  history,
  relays,
  names,
  profile,
  onToggleRelay,
  onOpenKillAll,
  onOpenRelaysTab
}) {
  const canvasRef = useRef(null);

  // Smooth oscilloscope / live power curve
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Background
    ctx.fillStyle = '#061311';
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid lines
    ctx.strokeStyle = 'rgba(0, 229, 204, 0.07)';
    ctx.lineWidth = 1;
    for (let y = 15; y < height; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 30; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (history.length < 2) return;

    const powers = history.map((h) => h.p || h.v * h.i * (live.pf || 0.94) || 0);
    const maxP = Math.max(...powers, 10);
    const minP = Math.min(...powers, 0);
    const range = Math.max(maxP - minP, 5);

    // Gradient Fill Under Wave
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(0, 229, 204, 0.35)');
    grad.addColorStop(1, 'rgba(0, 229, 204, 0.0)');

    ctx.beginPath();
    history.forEach((pt, i) => {
      const p = pt.p || pt.v * pt.i * (live.pf || 0.94) || 0;
      const x = (i / (history.length - 1)) * width;
      const y = height - 12 - ((p - minP) / range) * (height - 30);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevP = history[i - 1].p || history[i - 1].v * history[i - 1].i * (live.pf || 0.94) || 0;
        const prevX = ((i - 1) / (history.length - 1)) * width;
        const prevY = height - 12 - ((prevP - minP) / range) * (height - 30);
        const cx = (prevX + x) / 2;
        ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
      }
    });

    // Fill area
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw main glowing stroke
    ctx.beginPath();
    history.forEach((pt, i) => {
      const p = pt.p || pt.v * pt.i * (live.pf || 0.94) || 0;
      const x = (i / (history.length - 1)) * width;
      const y = height - 12 - ((p - minP) / range) * (height - 30);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevP = history[i - 1].p || history[i - 1].v * history[i - 1].i * (live.pf || 0.94) || 0;
        const prevX = ((i - 1) / (history.length - 1)) * width;
        const prevY = height - 12 - ((prevP - minP) / range) * (height - 30);
        const cx = (prevX + x) / 2;
        ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
      }
    });
    ctx.strokeStyle = '#00E5CC';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0, 229, 204, 0.6)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [history, live.pf]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Bill calculations matching Android app EnergyRepository.java
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const ratePerUnit = 7.0; // ₹7 per kWh
  const predictedBill = live.energy > 0.001 ? Math.round(live.energy * daysInMonth * ratePerUnit) : 0;
  const targetBudget = profile.budget || 2500;
  const budgetProgress = Math.min(Math.round((predictedBill / targetBudget) * 100), 100);
  const isOverBudget = predictedBill > targetBudget;

  // Active Relays count
  const activeCount = relays.filter(Boolean).length;

  // Voltage safety
  const voltageStatus = live.voltage < 100 ? 'critical' : live.voltage > 250 ? 'warning' : 'safe';
  const voltageLabel = live.voltage < 100 ? 'LOW VOLTAGE' : live.voltage > 250 ? 'SURGE' : 'NORMAL';

  // CO2 saved
  const co2Estimate = (live.energy * 0.82).toFixed(2); // ~0.82 kg CO2 per kWh grid baseline

  const getRelayIcon = (name = '') => {
    const l = name.toLowerCase();
    if (l.includes('ac')) return <AcIcon />;
    if (l.includes('fridge') || l.includes('refrig')) return <FridgeIcon />;
    if (l.includes('laptop') || l.includes('computer')) return <LaptopIcon />;
    if (l.includes('charger') || l.includes('phone')) return <ChargerIcon />;
    if (l.includes('wash')) return <WasherIcon />;
    return <LightIcon />;
  };

  return (
    <div className="home-tab-content">
      {/* Top Greeting Header */}
      <div className="top-header">
        <div className="header-greeting-wrap">
          <span className="header-tag">
            <BoltIcon size={16} /> LIVE ELECTRICAL TELEMETRY
          </span>
          <h1 className="header-title">
            {greeting}, {profile.username || 'Aura'}
          </h1>
        </div>

        <div className="header-actions">
          <button className="header-btn danger" onClick={onOpenKillAll} title="Emergency Kill All Appliances">
            ⚠️ KILL ALL
          </button>
        </div>
      </div>

      {/* Main Power Hero Card */}
      <div className="glass-card hero-power-card">
        <div className="hero-glow-blob"></div>

        <div className="hero-header">
          <div className="hero-label">
            <BoltIcon size={18} /> Whole Home · Live Reading
          </div>
          <div className="hero-live-badge">
            <span className="hero-live-dot"></span> REALTIME
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-power-digits">
            {live.power >= 1000 ? (live.power / 1000).toFixed(2) : live.power.toFixed(1)}
          </div>
          <div className="hero-power-unit">
            {live.power >= 1000 ? 'kW' : 'Watts'}
          </div>
        </div>
        <p className="hero-sub">Active power drawn across all connected circuits</p>

        {/* Live Power Wave Canvas */}
        <div className="waveform-canvas-container">
          <canvas ref={canvasRef} className="waveform-canvas" />
        </div>
      </div>

      {/* Grid of 6 Key Electrical Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Voltage</span>
            <span className={`status-pill ${voltageStatus}`}>{voltageLabel}</span>
          </div>
          <div className="metric-value accent-teal">{live.voltage.toFixed(1)} V</div>
          <div className="metric-sub">Nominal 220–240 V</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Current</span>
            <div className="metric-icon-wrap">⚡</div>
          </div>
          <div className="metric-value accent-blue">{live.current.toFixed(2)} A</div>
          <div className="metric-sub">Line amperage drawn</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Grid Frequency</span>
            <div className="metric-icon-wrap">〰️</div>
          </div>
          <div className="metric-value">{live.frequency.toFixed(2)} Hz</div>
          <div className="metric-sub">Standard 50.00 Hz</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Power Factor</span>
            <div className="metric-icon-wrap">cosφ</div>
          </div>
          <div className="metric-value accent-green">{live.pf.toFixed(2)}</div>
          <div className="metric-sub">Ideal &gt; 0.90</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Energy Used</span>
            <div className="metric-icon-wrap">🔋</div>
          </div>
          <div className="metric-value accent-amber">{live.energy.toFixed(3)} kWh</div>
          <div className="metric-sub">Cumulative total</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Environment</span>
            <div className="metric-icon-wrap">🌡️</div>
          </div>
          <div className="metric-value" style={{ fontSize: '20px' }}>
            {live.temp.toFixed(1)}°C · {live.hum}%
          </div>
          <div className="metric-sub">Room temperature & humidity</div>
        </div>
      </div>

      {/* Two Column Section: Quick Relays & Predicted Bill */}
      <div className="dashboard-columns">
        {/* Quick Relay Controls */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Appliance Relays</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {activeCount} ON · {4 - activeCount} OFF
              </p>
            </div>
            <button
              onClick={onOpenRelaysTab}
              style={{ background: 'transparent', border: 0, color: 'var(--volt-teal)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              View All 4 →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[0, 1].map((idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '14px',
                  background: relays[idx] ? 'rgba(0, 229, 204, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: relays[idx] ? '1px solid rgba(0, 229, 204, 0.3)' : '1px solid var(--border-light)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ color: relays[idx] ? 'var(--volt-teal)' : 'var(--text-muted)' }}>
                    {getRelayIcon(names[idx])}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>{names[idx]}</div>
                    <div style={{ fontSize: '11px', color: relays[idx] ? 'var(--volt-teal)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {relays[idx] ? 'RUNNING' : 'STANDBY'}
                    </div>
                  </div>
                </div>

                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={relays[idx] || false}
                    onChange={() => onToggleRelay(idx)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Predicted Bill & Budget Progress */}
        <div className="glass-card">
          <div className="bill-card-header">
            <div>
              <span className="metric-title">Predicted Monthly Bill</span>
              <div className="bill-amount-wrap">
                <span className="bill-currency">₹</span>
                <span className="bill-amount">{predictedBill.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Budget</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>₹{targetBudget.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <div className="budget-progress-track">
            <div
              className={`budget-progress-fill ${isOverBudget ? 'overbudget' : ''}`}
              style={{ width: `${budgetProgress}%` }}
            ></div>
          </div>

          <div className="bill-meta-row">
            <span>{budgetProgress}% of monthly limit used</span>
            <span>₹7.0 / unit tariff rate</span>
          </div>

          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
            <span style={{ color: 'var(--volt-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🌱 Est. CO₂ Offset: <strong>{co2Estimate} kg</strong>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Period: {new Date().toLocaleString('en-US', { month: 'short' })} 1 – {daysInMonth}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
