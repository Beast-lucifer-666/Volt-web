import React, { useState } from 'react';
import { updateUserDbProfile } from '../firebase';

export default function SetupWizard({ user, onComplete }) {
  const [deviceId, setDeviceId] = useState('simulator_01');
  const [budget, setBudget] = useState(2500);
  const [r1, setR1] = useState('AC Unit');
  const [r2, setR2] = useState('Fridge');
  const [r3, setR3] = useState('Lights');
  const [r4, setR4] = useState('Washer');
  const [saving, setSaving] = useState(false);

  const appliances = [
    'AC Unit',
    'Fridge',
    'Lights',
    'Washer',
    'Microwave',
    'Geyser',
    'TV',
    'Fan',
    'Phone Charger',
    'Gaming Laptop',
    'EV Charger',
    'Computer'
  ];

  const handleFinish = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserDbProfile(user.uid, {
        device_id: deviceId.trim() || 'simulator_01',
        monthly_budget: Number(budget) || 2500,
        relay1_name: r1,
        relay2_name: r2,
        relay3_name: r3,
        relay4_name: r4,
        setup_completed: true
      });
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Failed to complete setup:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <h2 className="modal-title">⚡ Welcome to Volt Setup</h2>
        <p className="modal-desc">
          Configure your smart energy monitor and name your appliances. You can always change this later in settings.
        </p>

        <form onSubmit={handleFinish}>
          <div className="form-group">
            <label className="form-label">Energy Monitor Device ID</label>
            <input
              type="text"
              className="form-input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. simulator_01"
              required
            />
            <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
              Default hardware simulator ID is <code>simulator_01</code>
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Monthly Target Budget (₹)</label>
            <input
              type="number"
              className="form-input"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min="100"
              step="50"
              required
            />
          </div>

          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <span className="form-label">Name Your 4 Appliance Relays:</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Relay 1 (Slot 1)</label>
              <select
                className="form-input"
                value={r1}
                onChange={(e) => setR1(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {appliances.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Relay 2 (Slot 2)</label>
              <select
                className="form-input"
                value={r2}
                onChange={(e) => setR2(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {appliances.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Relay 3 (Slot 3)</label>
              <select
                className="form-input"
                value={r3}
                onChange={(e) => setR3(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {appliances.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Relay 4 (Slot 4)</label>
              <select
                className="form-input"
                value={r4}
                onChange={(e) => setR4(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {appliances.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="form-btn-primary" disabled={saving}>
            {saving ? 'Saving Preferences...' : 'COMPLETE SETUP →'}
          </button>
        </form>
      </div>
    </div>
  );
}
