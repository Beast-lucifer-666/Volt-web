import React, { useState, useEffect, useRef } from 'react';
import {
  auth,
  db,
  loginUser,
  registerUser,
  logoutUser,
  updateUserDbProfile
} from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, update } from 'firebase/database';

import {
  BoltIcon,
  HomeIcon,
  RelayIcon,
  AnalyticsIcon,
  AlertIcon,
  SettingsIcon,
  LogoutIcon,
  SpeakerIcon
} from './components/Icons';

import HomeTab from './components/HomeTab';
import RelaysTab from './components/RelaysTab';
import AnalyticsTab from './components/AnalyticsTab';
import AlertsTab from './components/AlertsTab';
import AuthModal from './components/AuthModal';
import SetupWizard from './components/SetupWizard';
import ProfileModal from './components/ProfileModal';
import KillAllModal from './components/KillAllModal';
import { playAlertChime } from './utils/audio';

const defaultRelayNames = ['Light 1', 'Phone Charger', 'Laptop (Gaming)', 'Light 2'];

// Helper to extract numeric values from sensor objects with alias fallback
function getNum(obj, ...keys) {
  if (!obj) return 0;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) {
      const n = Number(obj[k]);
      if (!isNaN(n)) return n;
    }
  }
  return 0;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'relays' | 'analytics' | 'alerts'

  // Modals
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isKillAllOpen, setIsKillAllOpen] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Sound Chime State
  const [soundEnabled, setSoundEnabled] = useState(true);

  // User Profile from RTDB (Exact Firebase Schema mapping)
  const [userProfile, setUserProfile] = useState({
    username: 'Aura',
    monthly_budget: 1000,
    budget: 1000,
    device_id: '001',
    deviceId: '001',
    setup_completed: true,
    setupCompleted: true,
    profile_image_type: 'uri',
    photoType: 'uri',
    profile_image_value: '',
    photoValue: '',
    relay1_name: 'Light 1',
    relay2_name: 'Phone Charger',
    relay3_name: 'Laptop (Gaming)',
    relay4_name: 'Light 2'
  });

  // Relay State & Custom Names
  const [relays, setRelays] = useState([false, false, false, false]);
  const [relayNames, setRelayNames] = useState(defaultRelayNames);

  // Live Telemetry from Firebase
  const [live, setLive] = useState({
    voltage: 224.9,
    current: 0.0,
    power: 1.6,
    energy: 0.75,
    frequency: 50.0,
    pf: 1.0,
    temp: 29.6,
    hum: 80
  });

  // Initialize running history wave so charts are dynamic from first render
  const [history, setHistory] = useState(() => {
    const init = [];
    const now = Date.now();
    for (let j = 30; j >= 0; j--) {
      init.push({
        v: 224.9 + Math.sin(j / 2.5) * 1.5,
        i: 0.0,
        p: 1.6,
        t: now - j * 1000
      });
    }
    return init;
  });

  const [isOnline, setIsOnline] = useState(true);

  // Last voltage ref to prevent repeated sound alerts
  const lastVoltageAlertRef = useRef(false);
  const staleTimerRef = useRef(null);

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Realtime Database Subscriptions for User, Relays & Sensors
  useEffect(() => {
    if (!user) return;

    // A. Listen to user profile (users/<uid>)
    const userRef = ref(db, `users/${user.uid}`);
    const userUnsub = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.val() || {};
        const profileObj = {
          username: d.username || user.displayName || 'User',
          monthly_budget: d.monthly_budget !== undefined ? Number(d.monthly_budget) : 1000,
          budget: d.monthly_budget !== undefined ? Number(d.monthly_budget) : 1000,
          device_id: d.device_id || '001',
          deviceId: d.device_id || '001',
          setup_completed: d.setup_completed !== false,
          setupCompleted: d.setup_completed !== false,
          profile_image_type: d.profile_image_type || (d.profile_image_value?.startsWith('data:') ? 'uri' : 'avatar'),
          photoType: d.profile_image_type || (d.profile_image_value?.startsWith('data:') ? 'uri' : 'avatar'),
          profile_image_value: d.profile_image_value || '',
          photoValue: d.profile_image_value || '',
          relay1_name: d.relay1_name || defaultRelayNames[0],
          relay2_name: d.relay2_name || defaultRelayNames[1],
          relay3_name: d.relay3_name || defaultRelayNames[2],
          relay4_name: d.relay4_name || defaultRelayNames[3]
        };

        setUserProfile(profileObj);

        setRelayNames([
          profileObj.relay1_name,
          profileObj.relay2_name,
          profileObj.relay3_name,
          profileObj.relay4_name
        ]);

        if (d.setup_completed === false) {
          setShowSetupWizard(true);
        }
      }
    });

    // B. Listen to relay commands
    const commandsRef = ref(db, 'commands');
    const commandsUnsub = onValue(commandsRef, (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.val() || {};
        setRelays([
          d.relay1 === true,
          d.relay2 === true,
          d.relay3 === true,
          d.relay4 === true
        ]);
      }
    });

    // C. Listen to live sensor telemetry with automatic fallback (sensordata)
    const sensordataRef = ref(db, 'sensordata');
    const sensorUnsub = onValue(sensordataRef, (snapshot) => {
      if (snapshot.exists()) {
        const all = snapshot.val() || {};
        
        // Priority 1: User's configured device_id (e.g. "001")
        const targetId = userProfile.device_id || userProfile.deviceId || 'simulator_01';
        let d = all[targetId]?.latest;

        // Priority 2: Standard hardware simulator node 'simulator_01'
        if (!d && all['simulator_01']?.latest) {
          d = all['simulator_01'].latest;
        }

        // Priority 3: First available device with latest data
        if (!d) {
          for (const key of Object.keys(all)) {
            if (all[key]?.latest) {
              d = all[key].latest;
              break;
            }
          }
        }

        if (!d) return;

        const v = getNum(d, 'voltage', 'v');
        const i = getNum(d, 'current', 'i');
        let p = getNum(d, 'power', 'p');
        const e = getNum(d, 'energy', 'kwh', 'energyKwh');
        const f = getNum(d, 'frequency', 'f') || 50.0;
        const pf = getNum(d, 'powerFactor', 'pf') || 1.0;
        const temp = getNum(d, 'temperature', 'temp');
        const hum = Math.round(getNum(d, 'humidity', 'hum'));

        // If active power is not explicitly non-zero, compute P = V * I * pf
        if (p <= 0 && v > 0 && i > 0) {
          p = v * i * pf;
        }

        const newLive = {
          voltage: v > 0 ? v : 224.9,
          current: i,
          power: p,
          energy: e > 0 ? e : 0.75,
          frequency: f > 0 ? f : 50.0,
          pf: pf > 0 ? pf : 1.0,
          temp: temp > 0 ? temp : 29.6,
          hum: hum > 0 ? hum : 80
        };

        setLive(newLive);
        setIsOnline(true);

        // Update real-time history
        setHistory((prev) => {
          const next = [...prev, { v: newLive.voltage, i: newLive.current, p: newLive.power, t: Date.now() }];
          return next.slice(-60); // keep last 60 points
        });

        // Trigger safety alert chimes if enabled
        if (v > 5 && v < 100) {
          if (!lastVoltageAlertRef.current && soundEnabled) {
            playAlertChime('critical');
            lastVoltageAlertRef.current = true;
          }
        } else {
          lastVoltageAlertRef.current = false;
        }

        // Reset stale timer
        if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
        staleTimerRef.current = setTimeout(() => {
          setIsOnline(false);
        }, 15000);
      }
    });

    return () => {
      userUnsub();
      commandsUnsub();
      sensorUnsub();
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    };
  }, [user, userProfile.device_id, soundEnabled]);

  // Keyboard Navigation (macOS / iPad friendly)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === '1') setActiveTab('home');
      if (e.key === '2') setActiveTab('relays');
      if (e.key === '3') setActiveTab('analytics');
      if (e.key === '4') setActiveTab('alerts');
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
        setIsKillAllOpen(false);
        setShowSetupWizard(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Relay Control Handlers
  const handleToggleRelay = (idx) => {
    const relayNum = idx + 1;
    const nextState = !relays[idx];

    // Optimistic update
    setRelays((prev) => {
      const copy = [...prev];
      copy[idx] = nextState;
      return copy;
    });

    // Write to Firebase commands
    const relayRef = ref(db, `commands/relay${relayNum}`);
    set(relayRef, nextState);
  };

  const handleTurnAllOn = () => {
    setRelays([true, true, true, true]);
    const commandsRef = ref(db, 'commands');
    update(commandsRef, { relay1: true, relay2: true, relay3: true, relay4: true });
  };

  const handleTurnAllOff = () => {
    setRelays([false, false, false, false]);
    const commandsRef = ref(db, 'commands');
    update(commandsRef, { relay1: false, relay2: false, relay3: false, relay4: false });
  };

  // Emergency Kill All
  const handleConfirmKillAll = () => {
    setRelays([false, false, false, false]);
    const commandsRef = ref(db, 'commands');
    update(commandsRef, {
      killAll: true,
      relay1: false,
      relay2: false,
      relay3: false,
      relay4: false
    });
    // Auto reset killAll flag after 1 second matching Android repo
    setTimeout(() => {
      update(commandsRef, { killAll: false });
    }, 1000);
  };

  const handleRenameRelay = (idx, newName) => {
    if (!user) return;
    const relayNum = idx + 1;
    updateUserDbProfile(user.uid, {
      [`relay${relayNum}_name`]: newName
    });
    setRelayNames((prev) => {
      const copy = [...prev];
      copy[idx] = newName;
      return copy;
    });
  };

  if (authLoading) {
    return (
      <div className="auth-page-container">
        <div style={{ textAlign: 'center' }}>
          <div className="volt-brand-icon" style={{ width: '64px', height: '64px', margin: '0 auto 16px' }}>
            <img src="/volt_icon.svg" alt="Volt Logo" />
          </div>
          <div style={{ color: 'var(--volt-teal)', fontSize: '18px', fontWeight: 600 }}>
            Initializing Volt Smart Energy...
          </div>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Auth Screen
  if (!user) {
    return <AuthModal isOpen={true} onAuthSuccess={() => {}} />;
  }

  // Active alerts count for badge
  const activeAlertsCount =
    (live.voltage > 5 && live.voltage < 100 ? 1 : 0) +
    (live.voltage > 250 ? 1 : 0) +
    (live.current > 15 ? 1 : 0) +
    (live.temp > 45 ? 1 : 0);

  const hasPhotoImg = userProfile.photoValue && (userProfile.photoValue.startsWith('data:') || userProfile.photoValue.startsWith('http'));

  return (
    <div className="volt-app-shell">
      {/* 1. Sidebar Navigation (macOS / Desktop) */}
      <aside className="volt-sidebar">
        <div className="volt-brand" onClick={() => setActiveTab('home')}>
          <div className="volt-brand-icon">
            <img src="/volt_icon.svg" alt="Volt" />
          </div>
          <div>
            <div className="volt-brand-title">VOLT</div>
            <div className="volt-brand-sub">Smart Energy</div>
          </div>
        </div>

        <nav className="volt-nav">
          <button
            type="button"
            className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <div className="nav-icon"><HomeIcon /></div>
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`nav-link ${activeTab === 'relays' ? 'active' : ''}`}
            onClick={() => setActiveTab('relays')}
          >
            <div className="nav-icon"><RelayIcon /></div>
            <span>Relays</span>
          </button>

          <button
            type="button"
            className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <div className="nav-icon"><AnalyticsIcon /></div>
            <span>Analytics</span>
          </button>

          <button
            type="button"
            className={`nav-link ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <div className="nav-icon"><AlertIcon /></div>
            <span>Alerts</span>
            {activeAlertsCount > 0 && (
              <span className="nav-badge">{activeAlertsCount}</span>
            )}
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="volt-sidebar-footer">
          <div className="system-status-indicator">
            <div className="status-dot-container">
              <span className={`status-dot ${isOnline ? '' : 'offline'}`}></span>
              <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <button
              type="button"
              className={`chime-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title="Toggle audio alert chime"
            >
              <SpeakerIcon size={14} />
              {soundEnabled ? 'Sound' : 'Mute'}
            </button>
          </div>

          <div className="user-profile-card" onClick={() => setIsProfileOpen(true)}>
            <div className="avatar-bubble">
              {hasPhotoImg ? (
                <img src={userProfile.photoValue} alt="Avatar" />
              ) : (
                <span>{userProfile.photoValue || userProfile.username?.[0] || 'A'}</span>
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{userProfile.username}</div>
              <div className="user-sub">Target: ₹{userProfile.monthly_budget || userProfile.budget}</div>
            </div>
            <button type="button" className="settings-btn-icon">
              <SettingsIcon size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main View Content */}
      <main className="volt-main">
        {activeTab === 'home' && (
          <HomeTab
            live={live}
            history={history}
            relays={relays}
            names={relayNames}
            profile={userProfile}
            onToggleRelay={handleToggleRelay}
            onOpenKillAll={() => setIsKillAllOpen(true)}
            onOpenRelaysTab={() => setActiveTab('relays')}
          />
        )}

        {activeTab === 'relays' && (
          <RelaysTab
            relays={relays}
            names={relayNames}
            livePower={live.power}
            onToggleRelay={handleToggleRelay}
            onKillAll={() => setIsKillAllOpen(true)}
            onTurnAllOn={handleTurnAllOn}
            onTurnAllOff={handleTurnAllOff}
            onRenameRelay={handleRenameRelay}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            live={live}
            history={history}
            profile={userProfile}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsTab
            live={live}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            onKillAll={() => setIsKillAllOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* 3. Mobile Floating Bottom Navigation (iOS Safari Capsule Dock) */}
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <div className="nav-icon"><HomeIcon size={22} /></div>
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'relays' ? 'active' : ''}`}
          onClick={() => setActiveTab('relays')}
        >
          <div className="nav-icon"><RelayIcon size={22} /></div>
          <span>Relays</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <div className="nav-icon"><AnalyticsIcon size={22} /></div>
          <span>Analytics</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <div className="nav-icon"><AlertIcon size={22} /></div>
          <span>Alerts</span>
          {activeAlertsCount > 0 && <span className="mobile-nav-badge"></span>}
        </button>

        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => setIsProfileOpen(true)}
        >
          <div className="nav-icon"><SettingsIcon size={22} /></div>
          <span>Settings</span>
        </button>
      </nav>

      {/* 4. Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        profile={userProfile}
        onProfileUpdated={() => {}}
      />

      <KillAllModal
        isOpen={isKillAllOpen}
        onClose={() => setIsKillAllOpen(false)}
        onConfirm={handleConfirmKillAll}
      />

      {showSetupWizard && (
        <SetupWizard
          user={user}
          onComplete={() => setShowSetupWizard(false)}
        />
      )}
    </div>
  );
}
