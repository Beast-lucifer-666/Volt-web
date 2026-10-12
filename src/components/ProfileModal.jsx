import React, { useState, useEffect } from 'react';
import { updateUserDbProfile, logoutUser } from '../firebase';
import { sendEmailVerification } from 'firebase/auth';

export default function ProfileModal({ isOpen, onClose, user, profile, onProfileUpdated }) {
  const [username, setUsername] = useState('User');
  const [budget, setBudget] = useState(1000);
  const [deviceId, setDeviceId] = useState('001');
  const [r1, setR1] = useState('Light 1');
  const [r2, setR2] = useState('Phone Charger');
  const [r3, setR3] = useState('Laptop (Gaming)');
  const [r4, setR4] = useState('Light 2');
  const [photo, setPhoto] = useState('');
  const [photoType, setPhotoType] = useState('avatar');
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Sync state whenever modal opens or profile changes
  useEffect(() => {
    if (isOpen && profile) {
      setUsername(profile.username || user?.displayName || 'User');
      setBudget(profile.monthly_budget !== undefined ? profile.monthly_budget : (profile.budget !== undefined ? profile.budget : 1000));
      setDeviceId(profile.device_id || profile.deviceId || '001');
      setR1(profile.relay1_name || 'Light 1');
      setR2(profile.relay2_name || 'Phone Charger');
      setR3(profile.relay3_name || 'Laptop (Gaming)');
      setR4(profile.relay4_name || 'Light 2');
      setPhoto(profile.profile_image_value || profile.photoValue || '');
      setPhotoType(profile.profile_image_type || profile.photoType || (profile.profile_image_value?.startsWith('data:') ? 'uri' : 'avatar'));
      setMsg('');
    }
  }, [isOpen, profile, user]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
      setPhotoType('uri');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const updateData = {
        username: username.trim(),
        monthly_budget: Number(budget) || 1000,
        device_id: deviceId.trim() || '001',
        relay1_name: r1.trim(),
        relay2_name: r2.trim(),
        relay3_name: r3.trim(),
        relay4_name: r4.trim(),
        profile_image_type: photoType,
        profile_image_value: photo
      };

      await updateUserDbProfile(user.uid, updateData);
      setMsg('Settings saved successfully!');
      if (onProfileUpdated) onProfileUpdated(updateData);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setMsg('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    try {
      if (user) {
        await sendEmailVerification(user);
        alert('Verification email has been re-sent to ' + user.email);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const isImage = photo && (photo.startsWith('data:image') || photo.startsWith('http'));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        <h2 className="modal-title">Profile & Device Settings</h2>
        <p className="modal-desc">Manage your home account, appliances, and alert limits.</p>

        {msg && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', background: msg.includes('Error') ? 'rgba(255,68,68,0.15)' : 'rgba(0,229,204,0.15)', color: msg.includes('Error') ? '#FFA3A3' : 'var(--volt-teal)' }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Avatar preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div className="avatar-bubble" style={{ width: '56px', height: '56px', fontSize: '24px' }}>
              {isImage ? (
                <img src={photo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>{photo || username?.[0]?.toUpperCase() || 'V'}</span>
              )}
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--volt-teal)', cursor: 'pointer', display: 'block', fontWeight: 600 }}>
                📷 Change Photo
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user?.email}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Display Name / Home Owner</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Monthly Target Budget (₹)</label>
            <input
              type="number"
              className="form-input"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Sensor Device ID</label>
            <input
              type="text"
              className="form-input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. 001 or simulator_01"
              required
            />
          </div>

          <div style={{ margin: '18px 0 10px' }}>
            <span className="form-label">Custom Appliance Names:</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Relay 1</label>
              <input className="form-input" value={r1} onChange={(e) => setR1(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Relay 2</label>
              <input className="form-input" value={r2} onChange={(e) => setR2(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Relay 3</label>
              <input className="form-input" value={r3} onChange={(e) => setR3(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Relay 4</label>
              <input className="form-input" value={r4} onChange={(e) => setR4(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="form-btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'SAVE SETTINGS'}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {!user?.emailVerified ? (
            <button
              type="button"
              onClick={handleSendVerification}
              style={{ background: 'transparent', border: 0, color: 'var(--volt-amber)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Verify Email Address
            </button>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--volt-green)' }}>✓ Email Verified</span>
          )}

          <button
            type="button"
            onClick={logoutUser}
            style={{ background: 'transparent', border: 0, color: 'var(--volt-red)', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
