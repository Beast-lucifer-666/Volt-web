import React, { useState } from 'react';
import { registerUser, loginUser, resetPassword } from '../firebase';
import { BoltIcon } from './Icons';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('⚡');
  const [customPhotoBase64, setCustomPhotoBase64] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const avatarOptions = ['⚡', '🤖', '🚀', '🌿', '💡'];

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be smaller than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomPhotoBase64(reader.result);
      setSelectedAvatar('custom');
    };
    reader.readAsDataURL(file);
  };

  const cleanFirebaseError = (msg) => {
    if (!msg) return 'An error occurred';
    if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
      return 'Invalid email or password.';
    }
    if (msg.includes('email-already-in-use')) {
      return 'An account with this email already exists. Try signing in.';
    }
    if (msg.includes('weak-password')) {
      return 'Password should be at least 6 characters.';
    }
    if (msg.includes('network-request-failed')) {
      return 'Network connection error. Check your internet.';
    }
    return msg.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        if (!email || !password) throw new Error('Please enter both email and password.');
        await loginUser(email, password);
        if (onAuthSuccess) onAuthSuccess();
      } else if (tab === 'register') {
        if (!email || !password) throw new Error('Please enter email and password.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        
        const avatarType = customPhotoBase64 ? 'uri' : 'avatar';
        const avatarVal = customPhotoBase64 || selectedAvatar;
        
        await registerUser(email, password, username || email.split('@')[0], avatarType, avatarVal);
        setSuccessMsg('Account created successfully! A verification email has been sent.');
        if (onAuthSuccess) onAuthSuccess();
      } else if (tab === 'forgot') {
        if (!email) throw new Error('Please enter your email address to reset password.');
        await resetPassword(email);
        setSuccessMsg(`Password reset link sent to ${email}. Check your inbox!`);
      }
    } catch (err) {
      setError(cleanFirebaseError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="volt-brand-icon auth-logo">
            <img src="/volt_icon.svg" alt="Volt Logo" />
          </div>
          <h1 className="auth-title">VOLT</h1>
          <p className="auth-subtitle">
            Smart Home Energy Monitoring & Control
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
          >
            Create Account
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'forgot' ? 'active' : ''}`}
            onClick={() => { setTab('forgot'); setError(''); setSuccessMsg(''); }}
          >
            Reset
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-success-banner">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name or Nickname</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Choose Avatar</label>
                <div className="avatar-presets-grid">
                  {avatarOptions.map((av) => (
                    <button
                      type="button"
                      key={av}
                      className={`avatar-preset-item ${selectedAvatar === av && !customPhotoBase64 ? 'selected' : ''}`}
                      onClick={() => { setSelectedAvatar(av); setCustomPhotoBase64(''); }}
                    >
                      {av}
                    </button>
                  ))}
                  {customPhotoBase64 && (
                    <div className="avatar-preset-item selected" style={{ overflow: 'hidden' }}>
                      <img src={customPhotoBase64} alt="Custom" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
                <label style={{ fontSize: '12px', color: 'var(--volt-teal)', cursor: 'pointer', display: 'inline-block' }}>
                  📁 Upload Custom Photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                </label>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {tab !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}

          <button type="submit" className="form-btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : tab === 'login' ? 'SIGN IN →' : tab === 'register' ? 'CREATE ACCOUNT →' : 'SEND RESET LINK'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          {tab === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <span
                style={{ color: 'var(--volt-teal)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setTab('register'); setError(''); }}
              >
                Sign up free
              </span>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <span
                style={{ color: 'var(--volt-teal)', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setTab('login'); setError(''); }}
              >
                Sign in here
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
