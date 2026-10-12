import React, { useState, useEffect, useRef } from 'react';
import { BoltIcon, PrintIcon } from './Icons';

export default function AnalyticsTab({ live, history, profile }) {
  const [period, setPeriod] = useState('day'); // 'day' | 'week' | 'month' | 'year'
  const [scale, setScale] = useState('1 min'); // '1 min' | '3 mins' | '5 mins' | '10 mins'
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  const oscCanvasRef = useRef(null);
  const periodCanvasRef = useRef(null);
  const modalCanvasRef = useRef(null);

  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();
  const monthOfYear = now.getMonth();

  const e = live?.energy !== undefined && live.energy > 0 ? live.energy : 0.740;

  // 1. Dual-Trace Oscilloscope Canvas
  const drawWaveform = (canvas, isReport = false) => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Background matching Android bg_dark #111D1C
    ctx.fillStyle = isReport ? '#111D1C' : '#071513';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 229, 204, 0.08)';
    ctx.lineWidth = 1;
    for (let y = 20; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 30; x < w; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (!history || history.length === 0) return;

    const dataPoints = history.length === 1
      ? [{ ...history[0] }, { ...history[0] }]
      : history;

    // Voltage Trace (#00E5CC)
    const voltages = dataPoints.map((p) => p.v || 224.9);
    const maxV = Math.max(...voltages, 240);
    const minV = Math.min(...voltages, 180);
    const rangeV = Math.max(maxV - minV, 10);

    ctx.beginPath();
    dataPoints.forEach((pt, i) => {
      const v = pt.v || 224.9;
      const x = (i / (dataPoints.length - 1)) * w;
      const y = h - 20 - ((v - minV) / rangeV) * (h - 45);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#00E5CC';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Current Trace (#4488FF)
    const currents = dataPoints.map((p) => p.i || 0);
    const maxI = Math.max(...currents, 5);
    const minI = Math.min(...currents, 0);
    const rangeI = Math.max(maxI - minI, 0.5);

    ctx.beginPath();
    dataPoints.forEach((pt, i) => {
      const cur = pt.i || 0;
      const x = (i / (dataPoints.length - 1)) * w;
      const y = h - 20 - ((cur - minI) / rangeI) * (h - 45);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#4488FF';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  useEffect(() => {
    drawWaveform(oscCanvasRef.current, false);
  }, [history]);

  useEffect(() => {
    if (showPrintModal) {
      setTimeout(() => {
        drawWaveform(modalCanvasRef.current, true);
      }, 50);
    }
  }, [showPrintModal, history]);

  // 2. Android EnergyRepository.java Period Calculations
  let periodData = [];
  let slotLabels = [];
  let chartLabels = [];
  let totalKwh = 0;
  let periodTitle = '';
  let periodSubtitle = '';
  let periodUnit = '';

  if (period === 'day') {
    periodTitle = 'Total kWh (Today)';
    periodSubtitle = 'Whole home · Today';
    periodUnit = 'kWh today';

    slotLabels = ['12–6 AM', '6–9 AM', '9 AM–12', '12–3 PM', '3–6 PM', '6 PM–12'];
    chartLabels = ['12AM', '4AM', '8AM', '12PM', '4PM', '8PM'];

    let currentSlot = 0;
    if (currentHour < 6) currentSlot = 0;
    else if (currentHour < 9) currentSlot = 1;
    else if (currentHour < 12) currentSlot = 2;
    else if (currentHour < 15) currentSlot = 3;
    else if (currentHour < 18) currentSlot = 4;
    else currentSlot = 5;

    if (currentSlot === 0) {
      periodData = [e, 0, 0, 0, 0, 0];
    } else {
      const pastPerSlot = Math.min(0.062, (e * 0.42) / currentSlot);
      const pastSum = pastPerSlot * currentSlot;
      const currentVal = Math.max(0, e - pastSum);
      periodData = [];
      for (let i = 0; i < 6; i++) {
        if (i < currentSlot) periodData.push(pastPerSlot);
        else if (i === currentSlot) periodData.push(currentVal);
        else periodData.push(0.0);
      }
    }
    totalKwh = e;
  } else if (period === 'week') {
    periodTitle = 'Total kWh (Weekly)';
    periodSubtitle = 'Whole home · This week';
    periodUnit = 'kWh this week';

    slotLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    chartLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const currentSlot = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const defaultHistory = [0.180, 0.240, 0.310, 0.210, 0.350, 0.280, 0.190];

    periodData = [];
    for (let i = 0; i < 7; i++) {
      if (i < currentSlot) periodData.push(defaultHistory[i]);
      else if (i === currentSlot) periodData.push(e);
      else periodData.push(0.0);
    }
    totalKwh = periodData.reduce((acc, v) => acc + v, 0);
  } else if (period === 'month') {
    periodTitle = 'Total kWh (Monthly)';
    periodSubtitle = 'Whole home · This month';
    periodUnit = 'kWh this month';

    slotLabels = ['D1–D5', 'D6–D10', 'D11–D15', 'D16–D20', 'D21–D25', 'D26–End'];
    chartLabels = ['D1', 'D6', 'D11', 'D16', 'D21', 'D26'];

    const currentSlot = Math.min(Math.floor((dayOfMonth - 1) / 5), 5);
    const defaultHistory = [1.200, 1.500, 1.800, 1.400, 1.600, 1.900];

    periodData = [];
    for (let i = 0; i < 6; i++) {
      if (i < currentSlot) periodData.push(defaultHistory[i]);
      else if (i === currentSlot) periodData.push(e);
      else periodData.push(0.0);
    }
    totalKwh = periodData.reduce((acc, v) => acc + v, 0);
  } else { // YEAR
    periodTitle = 'Total kWh (Yearly)';
    periodSubtitle = 'Whole home · This year';
    periodUnit = 'kWh this year';

    slotLabels = ['Jan–Feb', 'Mar–Apr', 'May–Jun', 'Jul–Aug', 'Sep–Oct', 'Nov–Dec'];
    chartLabels = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];

    const currentSlot = Math.min(Math.floor(monthOfYear / 2), 5);
    const defaultHistory = [12.000, 15.000, 18.000, 14.000, 16.000, 19.000];

    periodData = [];
    for (let i = 0; i < 6; i++) {
      if (i < currentSlot) periodData.push(defaultHistory[i]);
      else if (i === currentSlot) periodData.push(e);
      else periodData.push(0.0);
    }
    totalKwh = periodData.reduce((acc, v) => acc + v, 0);
  }

  // 3. Draw Spline Waveform (WeeklyChartView)
  useEffect(() => {
    const canvas = periodCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const chartBottom = h - 35;
    const chartTop = 20;
    const chartHeight = chartBottom - chartTop;

    ctx.clearRect(0, 0, w, h);

    const size = periodData.length;
    if (size === 0) return;

    const paddingX = 40;
    const drawWidth = w - (2 * paddingX);
    const xStep = size > 1 ? drawWidth / (size - 1) : drawWidth;

    const maxVal = Math.max(...periodData, 0.05);

    const xPoints = [];
    const yPoints = [];
    for (let i = 0; i < size; i++) {
      xPoints.push(paddingX + i * xStep);
      yPoints.push(chartBottom - (periodData[i] / maxVal) * chartHeight);
    }

    const path = new Path2D();
    const fillPath = new Path2D();

    path.moveTo(xPoints[0], yPoints[0]);
    fillPath.moveTo(xPoints[0], chartBottom);
    fillPath.lineTo(xPoints[0], yPoints[0]);

    for (let i = 1; i < size; i++) {
      const cx = (xPoints[i - 1] + xPoints[i]) / 2;
      path.bezierCurveTo(cx, yPoints[i - 1], cx, yPoints[i], xPoints[i], yPoints[i]);
      fillPath.bezierCurveTo(cx, yPoints[i - 1], cx, yPoints[i], xPoints[i], yPoints[i]);
    }

    fillPath.lineTo(xPoints[size - 1], chartBottom);
    fillPath.closePath();

    const fillGrad = ctx.createLinearGradient(0, chartTop, 0, chartBottom);
    fillGrad.addColorStop(0, 'rgba(0, 229, 204, 0.45)');
    fillGrad.addColorStop(1, 'rgba(0, 229, 204, 0.0)');
    ctx.fillStyle = fillGrad;
    ctx.fill(fillPath);

    ctx.strokeStyle = '#00E5CC';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 229, 204, 0.5)';
    ctx.shadowBlur = 10;
    ctx.stroke(path);
    ctx.shadowBlur = 0;

    for (let i = 0; i < size; i++) {
      ctx.beginPath();
      ctx.arc(xPoints[i], yPoints[i], 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 229, 204, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(xPoints[i], yPoints[i], 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00E5CC';
      ctx.fill();

      if (chartLabels[i]) {
        ctx.fillStyle = '#7AABAA';
        ctx.font = '500 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(chartLabels[i], xPoints[i], h - 10);
      }
    }
  }, [periodData, chartLabels]);

  const barGradients = [
    'linear-gradient(90deg, #00B4D8, #4488FF)',
    'linear-gradient(90deg, #00B4D8, #00E5CC)',
    'linear-gradient(90deg, #00C853, #00E5CC)',
    'linear-gradient(90deg, #FF6B1A, #FF4444)',
    'linear-gradient(90deg, #00C853, #00E5CC)',
    'linear-gradient(90deg, #00B4D8, #4488FF)',
    'linear-gradient(90deg, #00B4D8, #00E5CC)'
  ];

  const maxBarValue = Math.max(...periodData, 0.01);

  // Bill Estimation & Dates
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const predictedBill = Math.round(e * daysInMonth * 7.0);
  const targetBudget = profile?.monthly_budget || profile?.budget || 1000;
  const billProgressPct = Math.min(Math.round((predictedBill / targetBudget) * 100), 100);

  const monthYearStr = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const shortMonthStr = now.toLocaleString('en-US', { month: 'short' });
  let periodPrefix = dayOfMonth <= 10 ? 'Beginning of' : dayOfMonth <= 20 ? 'Middle of' : 'End of';

  // Save report directly as image (PNG) matching Android saveBitmapToGallery
  const handleSaveReportImage = () => {
    const reportElem = document.getElementById('analytics-print-report');
    if (!reportElem) return;

    // Create export canvas matching Android's captureAndSaveAnalytics()
    const exportCanvas = document.createElement('canvas');
    const w = 700;
    const h = 580;
    exportCanvas.width = w * 2;
    exportCanvas.height = h * 2;
    const ctx = exportCanvas.getContext('2d');
    ctx.scale(2, 2);

    // Dark background #111D1C
    ctx.fillStyle = '#111D1C';
    ctx.fillRect(0, 0, w, h);

    // Draw Legend
    ctx.font = '600 13px Inter, sans-serif';
    ctx.fillStyle = '#00E5CC';
    ctx.fillText('— Voltage (V)', 24, 30);
    ctx.fillStyle = '#4488FF';
    ctx.fillText('— Current (A)', 140, 30);

    // Draw Chart Waveform
    const chartY = 45;
    const chartH = 170;
    ctx.strokeStyle = 'rgba(0, 229, 204, 0.08)';
    ctx.lineWidth = 1;
    for (let y = chartY; y < chartY + chartH; y += 30) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    }

    if (history && history.length > 0) {
      const pts = history.length === 1 ? [{ ...history[0] }, { ...history[0] }] : history;
      const voltages = pts.map((p) => p.v || 224.9);
      const maxV = Math.max(...voltages, 240);
      const minV = Math.min(...voltages, 180);
      const rangeV = Math.max(maxV - minV, 10);

      ctx.beginPath();
      pts.forEach((pt, i) => {
        const v = pt.v || 224.9;
        const x = 20 + (i / (pts.length - 1)) * (w - 40);
        const y = chartY + chartH - 10 - ((v - minV) / rangeV) * (chartH - 25);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#00E5CC';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const currents = pts.map((p) => p.i || 0);
      const maxI = Math.max(...currents, 5);
      const minI = Math.min(...currents, 0);
      const rangeI = Math.max(maxI - minI, 0.5);

      ctx.beginPath();
      pts.forEach((pt, i) => {
        const cur = pt.i || 0;
        const x = 20 + (i / (pts.length - 1)) * (w - 40);
        const y = chartY + chartH - 10 - ((cur - minI) / rangeI) * (chartH - 25);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#4488FF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Report Title & Text (Matching Android paint text values)
    let curY = chartY + chartH + 45;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText('Current Analytics Report', 24, curY);

    ctx.font = '400 16px Inter, sans-serif';
    const lines = [
      `Voltage: ${live.voltage.toFixed(1)} V`,
      `Current: ${live.current.toFixed(2)} A`,
      `Active Power: ${live.power.toFixed(1)} W`,
      `Active Energy: ${e.toFixed(3)} kWh`,
      `Frequency: ${live.frequency.toFixed(2)} Hz`,
      `Power Factor: ${live.pf.toFixed(2)}`
    ];

    const spacing = 32;
    lines.forEach((line) => {
      curY += spacing;
      ctx.fillText(line, 24, curY);
    });

    curY += 36;
    ctx.fillStyle = '#7AABAA';
    ctx.font = '400 12px Inter, sans-serif';
    ctx.fillText(`Generated on: ${new Date().toString()}`, 24, curY);

    // Download PNG
    const link = document.createElement('a');
    link.download = `Analytics_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const handlePrintOnlyReport = () => {
    window.print();
  };

  return (
    <div className="analytics-tab-content">
      {/* 1. Header with Controls */}
      <div className="top-header">
        <div>
          <span className="header-tag">
            <BoltIcon size={16} /> COMPREHENSIVE ENERGY AUDIT
          </span>
          <h1 className="header-title">Analytics</h1>
        </div>

        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '10px', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>TIME SCALE</span>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              style={{ background: 'transparent', border: 0, color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="1 min" style={{ background: '#111D1C' }}>1 min</option>
              <option value="3 mins" style={{ background: '#111D1C' }}>3 mins</option>
              <option value="5 mins" style={{ background: '#111D1C' }}>5 mins</option>
              <option value="10 mins" style={{ background: '#111D1C' }}>10 mins</option>
            </select>
          </div>

          <button className="header-btn secondary" onClick={() => setShowPrintModal(true)} title="Print Current Analytics Report">
            <PrintIcon size={16} /> PRINT REPORT
          </button>
        </div>
      </div>

      {/* Connected Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '12px', color: '#00E676' }}>
        <span style={{ width: '8px', height: '8px', background: '#00E676', borderRadius: '50%', boxShadow: '0 0 8px #00E676' }}></span>
        <span>Connected</span>
      </div>

      {/* 2. Real-Time Oscilloscope Line Telemetry */}
      <div className="glass-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Oscilloscope Line Telemetry</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Dual dynamic waveform sampling</span>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600 }}>
            <span style={{ color: '#00E5CC' }}>— Voltage: {live.voltage.toFixed(1)} V</span>
            <span style={{ color: '#4488FF' }}>— Current: {live.current.toFixed(2)} A</span>
          </div>
        </div>

        <div className="waveform-canvas-container" style={{ height: '180px', marginTop: 0 }}>
          <canvas ref={oscCanvasRef} className="waveform-canvas" />
        </div>
      </div>

      {/* 3. 6 Main Stats Grid (Matching glMainStats) */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="metric-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Voltage</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#00E676', margin: '4px 0' }}>{live.voltage.toFixed(1)} V</div>
          <span style={{ fontSize: '10px', color: '#7AABAA' }}>Line stability: Safe</span>
        </div>

        <div className="metric-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#4488FF', margin: '4px 0' }}>{live.current.toFixed(2)} A</div>
          <span style={{ fontSize: '10px', color: '#7AABAA' }}>Active amperage</span>
        </div>

        <div className="metric-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Power</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#FFB300', margin: '4px 0' }}>{live.power.toFixed(1)} W</div>
          <span style={{ fontSize: '10px', color: '#7AABAA' }}>P = V × I × cosφ</span>
        </div>

        <div className="metric-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Energy</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#FF5252', margin: '4px 0' }}>{e.toFixed(3)} kWh</div>
          <span style={{ fontSize: '10px', color: '#7AABAA' }}>Cumulative total</span>
        </div>

        <div className="metric-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Frequency</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#00E5CC', margin: '4px 0' }}>{live.frequency.toFixed(2)} Hz</div>
          <span style={{ fontSize: '10px', color: '#7AABAA' }}>Nominal 50.00 Hz</span>
        </div>

        <div className="metric-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Power Factor</span>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#B455FF', margin: '4px 0' }}>{live.pf.toFixed(2)}</div>
          <span style={{ fontSize: '10px', color: '#7AABAA' }}>Efficiency rating</span>
        </div>
      </div>

      {/* 4. Period Buttons [ Day ] [ Week ] [ Month ] [ Year ] */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['day', 'week', 'month', 'year'].map((p) => {
          const isActive = period === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              style={{
                padding: '10px 24px',
                borderRadius: '30px',
                background: isActive ? '#00E5CC' : '#111D1C',
                color: isActive ? '#061713' : '#7AABAA',
                fontWeight: 700,
                fontSize: '14px',
                border: '1px solid ' + (isActive ? '#00E5CC' : 'rgba(255,255,255,0.06)'),
                boxShadow: isActive ? '0 0 16px rgba(0,229,204,0.4)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          );
        })}
      </div>

      {/* 5. Main Total kWh Period Card */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>{periodTitle}</h2>
            <p style={{ fontSize: '13px', color: '#7AABAA', marginTop: '4px' }}>{periodSubtitle}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '38px', fontWeight: 800, color: '#00E5CC', lineHeight: 1 }}>
              {totalKwh.toFixed(3)}
            </div>
            <span style={{ fontSize: '12px', color: '#7AABAA' }}>{periodUnit}</span>
          </div>
        </div>

        <div style={{ width: '100%', height: '170px', marginTop: '10px', position: 'relative' }}>
          <canvas ref={periodCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        <div className="usage-breakdown-list">
          {slotLabels.map((lbl, idx) => {
            const val = periodData[idx] || 0.0;
            const fraction = maxBarValue > 0 ? Math.min(val / maxBarValue, 1.0) : 0;
            const gradient = barGradients[idx % barGradients.length];

            return (
              <div key={lbl} className="usage-breakdown-row">
                <span className="usage-breakdown-label">{lbl}</span>
                <div className="usage-breakdown-track">
                  <div
                    className="usage-breakdown-fill"
                    style={{
                      width: `${fraction * 100}%`,
                      background: gradient
                    }}
                  />
                </div>
                <span className="usage-breakdown-value">{val.toFixed(3)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Summary Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#00E5CC' }}>{e.toFixed(3)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 6px' }}>kWh Today</div>
          <div style={{ fontSize: '12px', color: '#00E5CC', fontWeight: 600 }}>↓ 8% vs avg</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFB300' }}>₹{Math.round(e * 7.0)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 6px' }}>Bill Est.</div>
          <div style={{ fontSize: '12px', color: '#00E5CC', fontWeight: 600 }}>↑ On track</div>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#B455FF' }}>{(e * 0.82).toFixed(1)} kg</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 6px' }}>CO₂ Saved</div>
          <div style={{ fontSize: '12px', color: '#00E5CC', fontWeight: 600 }}>↑ 8.5%</div>
        </div>
      </div>

      {/* 7. Predicted Bill Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>Predicted Bill</h3>
            <p style={{ fontSize: '12px', color: '#7AABAA', marginTop: '4px' }}>
              {periodPrefix} {monthYearStr} - ₹7/unit
            </p>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, color: '#FFB300' }}>
            ₹{predictedBill.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="budget-progress-track" style={{ height: '10px', margin: '16px 0 10px' }}>
          <div
            className="budget-progress-fill"
            style={{ width: `${billProgressPct}%` }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#7AABAA', marginTop: '8px' }}>
          <span>{shortMonthStr} 1</span>
          <span>Today · Day {dayOfMonth}</span>
          <span>{shortMonthStr} {daysInMonth}</span>
        </div>
      </div>

      {/* 8. Dedicated Print Report Modal (Matches EXACT Android captureAndSaveAnalytics) */}
      {showPrintModal && (
        <div className="modal-overlay" id="analytics-print-overlay" onClick={() => setShowPrintModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ width: 'min(640px, 95vw)', padding: '24px', background: '#111D1C', border: '1px solid rgba(0,229,204,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Print / Export Report</h2>
              <button className="modal-close-btn" style={{ position: 'static' }} onClick={() => setShowPrintModal(false)}>×</button>
            </div>

            {/* The Isolated Report Card matching the User's Screenshot */}
            <div
              id="analytics-print-report"
              style={{
                background: '#111D1C',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* Legend */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', fontSize: '13px', fontWeight: 600 }}>
                <span style={{ color: '#00E5CC' }}>— Voltage (V)</span>
                <span style={{ color: '#4488FF' }}>— Current (A)</span>
              </div>

              {/* Chart */}
              <div style={{ width: '100%', height: '180px', borderRadius: '10px', overflow: 'hidden', background: '#111D1C', border: '1px solid rgba(255,255,255,0.05)' }}>
                <canvas ref={modalCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
              </div>

              {/* Text Report */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px' }}>
                  Current Analytics Report
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px', color: '#FFFFFF', lineHeight: 1.6 }}>
                  <div>Voltage: {live.voltage.toFixed(1)} V</div>
                  <div>Current: {live.current.toFixed(2)} A</div>
                  <div>Active Power: {live.power.toFixed(1)} W</div>
                  <div>Active Energy: {e.toFixed(3)} kWh</div>
                  <div>Frequency: {live.frequency.toFixed(2)} Hz</div>
                  <div>Power Factor: {live.pf.toFixed(2)}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#7AABAA', marginTop: '16px' }}>
                  Generated on: {new Date().toString()}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                type="button"
                className="form-btn-secondary"
                style={{ flex: 1, margin: 0 }}
                onClick={handleSaveReportImage}
              >
                📥 Save Image (PNG)
              </button>
              <button
                type="button"
                className="form-btn-primary"
                style={{ flex: 1, margin: 0 }}
                onClick={handlePrintOnlyReport}
              >
                🖨️ Print / AirPrint (PDF)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container for native browser print (Ctrl+P / Command+P) */}
      <div id="analytics-print-report" style={{ display: 'none' }}>
        <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', fontSize: '14px', fontWeight: 600 }}>
          <span style={{ color: '#00E5CC' }}>— Voltage (V)</span>
          <span style={{ color: '#4488FF' }}>— Current (A)</span>
        </div>
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
            Current Analytics Report
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '16px', color: '#FFFFFF' }}>
            <div>Voltage: {live.voltage.toFixed(1)} V</div>
            <div>Current: {live.current.toFixed(2)} A</div>
            <div>Active Power: {live.power.toFixed(1)} W</div>
            <div>Active Energy: {e.toFixed(3)} kWh</div>
            <div>Frequency: {live.frequency.toFixed(2)} Hz</div>
            <div>Power Factor: {live.pf.toFixed(2)}</div>
          </div>
          <div style={{ fontSize: '12px', color: '#7AABAA', marginTop: '20px' }}>
            Generated on: {new Date().toString()}
          </div>
        </div>
      </div>
    </div>
  );
}
