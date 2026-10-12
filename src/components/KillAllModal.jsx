import React from 'react';

export default function KillAllModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ borderColor: 'var(--volt-red)', boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(255,68,68,0.25)' }}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <span style={{ fontSize: '32px' }}>⚠️</span>
          <h2 className="modal-title" style={{ color: '#FFA3A3', margin: 0 }}>Emergency Kill All</h2>
        </div>
        <p className="modal-desc" style={{ color: '#fff', fontSize: '15px' }}>
          Are you sure you want to instantly shut off all 4 appliance relay circuits?
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          This will trip commands for Relay 1, Relay 2, Relay 3, and Relay 4 immediately to protect home equipment from electrical hazards.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="form-btn-secondary"
            style={{ margin: 0, flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="form-btn-primary"
            style={{ margin: 0, flex: 1, background: 'linear-gradient(135deg, #FF4444, #CC1A00)', color: '#fff', boxShadow: '0 4px 20px rgba(255,68,68,0.4)' }}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            CONFIRM KILL ALL
          </button>
        </div>
      </div>
    </div>
  );
}
