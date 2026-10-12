import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  get
} from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBtNGVVxOxZ1PPMPWcoY3d2rg8dlIGZskY',
  authDomain: 'volt-3b671.firebaseapp.com',
  databaseURL: 'https://volt-3b671-default-rtdb.firebaseio.com',
  projectId: 'volt-3b671',
  storageBucket: 'volt-3b671.firebasestorage.app'
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Authentication Helpers
export async function registerUser(email, password, displayName, avatarType = 'avatar', avatarVal = 'avatar1') {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  // Send verification email
  try {
    await sendEmailVerification(user);
  } catch (err) {
    console.warn('Failed to send verification email:', err);
  }

  // Update Auth Profile
  try {
    await updateProfile(user, {
      displayName: displayName || email.split('@')[0],
      photoURL: avatarType === 'uri' ? avatarVal : null
    });
  } catch (err) {
    console.warn('Failed to update auth profile:', err);
  }

  // Save to Realtime Database users/<uid>
  const userRef = ref(db, `users/${user.uid}`);
  await set(userRef, {
    username: displayName || email.split('@')[0],
    email: email,
    profile_image_type: avatarType,
    profile_image_value: avatarVal,
    device_id: 'simulator_01',
    monthly_budget: 2500,
    setup_completed: false,
    relay1_name: 'Light 1',
    relay2_name: 'Phone Charger',
    relay3_name: 'Laptop (Gaming)',
    relay4_name: 'Light 2',
    created_at: new Date().toISOString()
  });

  return user;
}

export async function loginUser(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email) {
  return await sendPasswordResetEmail(auth, email);
}

export async function logoutUser() {
  return await signOut(auth);
}

export async function updateUserDbProfile(uid, profileData) {
  const userRef = ref(db, `users/${uid}`);
  return await update(userRef, profileData);
}

export async function getUserDbProfile(uid) {
  const userRef = ref(db, `users/${uid}`);
  const snap = await get(userRef);
  return snap.exists() ? snap.val() : null;
}
