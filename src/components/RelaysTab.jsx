import React, { useState } from 'react';
import { BoltIcon, AcIcon, FridgeIcon, LightIcon, LaptopIcon, ChargerIcon, WasherIcon, TvIcon, FanIcon } from './Icons';

export default function RelaysTab({
  relays,
  names,
  livePower,
  onToggleRelay,
  onKillAll,
  onTurnAllOn,
  onTurnAllOff,
  onRenameRelay
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [newName, setNewName] = useState('');

  const getRelayIcon = (name = '') => {
    const l = name.toLowerCase();
    if (l.includes('ac') || l.includes('air')) return <AcIcon size={26} />;
    if (l.includes('fridge') || l.includes('refrig')) return <FridgeIcon size={26} />;
    if (l.includes('laptop') || l.includes('gaming') || l.includes('computer')) return <LaptopIcon size={26} />;
    if (l.includes('charger') || l.includes('phone')) return <ChargerIcon size={26} />;
    if (l.includes('wash')) return <WasherIcon size={26} />;
    if (l.includes('tv') || l.includes('television')) return <TvIcon size={26} />;
    if (l.includes('fan')) return <FanIcon size={26} />;
    return <LightIcon size={26} />;
  };

  const activeCount = relays.filter(Boolean).length;

  const handleStartEdit = (idx) => {
    setEditingIndex(idx);
    setNewName(names[idx]);
  };

  const handleSaveRename = (idx) => {
    if (newName.trim() && onRenameRelay) {
      onRenameRelay(idx, newName.trim());
    }
    setEditingIndex(null);
  };

  return (
    <div className="relays-tab-content">
      <div className="top-header">
        <div>
          <span className="header-tag">
            <BoltIcon size={16} /> REMOTE APPLIANCE CONTROL
          </span>
          <h1 className="header-title">Relay Control</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Toggle appliances & watch whole-home total power change in real-time
          </p>
        </div>

        <div className="header-actions">
          <button className="header-btn secondary" onClick={onTurnAllOn}>
            ⚡ Turn All ON
          </button>
          <button className="header-btn danger" onClick={onKillAll}>
            ⚠️ KILL ALL
          </button>
        </div>
      </div>

      {/* Watch Total Watts Interactive Banner (matching Android App cardTotalWatts) */}
      <div className="glass-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(14,35,32,0.85), rgba(8,20,18,0.9))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(0,229,204,0.15)', border: '1px solid rgba(0,229,204,0.3)', display: 'grid', placeItems: 'center', color: 'var(--volt-teal)' }}>
              👁️
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Interactive Load Observation</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Toggle any relay below — the whole-home wattage responds dynamically. {activeCount} circuits currently energized.
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Draw</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: 'var(--volt-teal)' }}>
              {livePower >= 1000 ? (livePower / 1000).toFixed(2) + ' kW' : livePower.toFixed(1) + ' W'}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Relay Cards Grid */}
      <div className="relays-grid">
        {[0, 1, 2, 3].map((idx) => {
          const isOn = relays[idx] || false;
          const applianceName = names[idx] || `Relay ${idx + 1}`;
          const isEditing = editingIndex === idx;

          return (
            <div key={idx} className={`relay-card ${isOn ? 'active' : ''}`}>
              <div className="relay-top">
                <div className="relay-info">
                  <div className="relay-icon-bubble">
                    {getRelayIcon(applianceName)}
                  </div>
                  <div className="relay-name-wrap">
                    <span className="relay-slot-label">Relay #{idx + 1}</span>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '4px 8px', fontSize: '13px', width: '130px' }}
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(idx)}
                          style={{ padding: '4px 8px', background: 'var(--volt-teal)', border: 0, borderRadius: '6px', color: '#041b16', fontWeight: 700, cursor: 'pointer' }}
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <h3
                        className="relay-title"
                        title="Click to rename"
                        onClick={() => handleStartEdit(idx)}
                        style={{ cursor: 'pointer' }}
                      >
                        {applianceName} ✏️
                      </h3>
                    )}
                  </div>
                </div>

                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => onToggleRelay(idx)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>

              <div className="relay-bottom">
                <span className="relay-status-text">
                  {isOn ? '● ENERGIZED' : '○ DE-ENERGIZED'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
