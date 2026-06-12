// js/db.js

// 1. Firebase Initialization
// We use the compat library to keep your app logic compatible with your existing code
const firebaseConfig = {
  apiKey: "AIzaSyCLVDsS6JP6q80e1UfDl_cig_pFW_2PVxo",
  authDomain: "id-card-collector.firebaseapp.com",
  projectId: "id-card-collector",
  storageBucket: "id-card-collector.firebasestorage.app",
  messagingSenderId: "341312488824",
  appId: "1:341312488824:web:b890158bfb9f1e1b70f48d",
  measurementId: "G-LXZ1JERLHK"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Services
const db = firebase.firestore();
const storage = firebase.storage();

// Expose these globally for your HTML files to use
window.db = db;
window.storage = storage;

// ... rest of your functions (savePhoto, getRecords, etc.) ...

// ===== PHOTO STORAGE =====
async function savePhoto(recordId, blobOrFile) {
  const ref = storage.ref(`photos/${recordId}`);
  await ref.put(blobOrFile);
  const url = await ref.getDownloadURL();
  await db.collection('records').doc(recordId).update({
    hasPhoto: true,
    photoUrl: url
  });
  return url;
}

async function getPhoto(recordId) {
  const doc = await db.collection('records').doc(recordId).get();
  return doc.exists ? doc.data().photoUrl : null;
}

async function deletePhoto(recordId) {
  try {
    const ref = storage.ref(`photos/${recordId}`);
    await ref.delete();
  } catch (err) {
    console.log('No photo to delete or error:', err);
  }
}

// ===== AUTH & USER HELPERS =====
async function getUsers() {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addUser(user) {
  await db.collection('users').doc(user.id).set(user);
}

function getCurrentUser() {
  const user = sessionStorage.getItem('idc_current_user');
  return user ? JSON.parse(user) : null;
}
function setCurrentUser(user) { sessionStorage.setItem('idc_current_user', JSON.stringify(user)); }
function clearCurrentUser() { sessionStorage.removeItem('idc_current_user'); }

function requireAuth() {
  const user = getCurrentUser();
  if (!user) { window.location.href = 'index.html'; return null; }
  return user;
}

// ===== RECORD HELPERS =====
async function addRecord(data) {
  const docRef = await db.collection('records').add({
    ...data,
    createdAt: new Date().toISOString()
  });
  return { id: docRef.id, ...data };
}

async function updateRecord(id, data) {
  await db.collection('records').doc(id).update({
    ...data,
    updatedAt: new Date().toISOString()
  });
}

// ===== SETTINGS & ORGANISATIONS =====
async function getCustomFields() {
  const doc = await db.collection('settings').doc('custom_fields').get();
  return doc.exists ? (doc.data().fields || []) : [];
}

async function saveCustomFields(fields) {
  await db.collection('settings').doc('custom_fields').set({ fields });
}

async function getOrganisations() {
  const doc = await db.collection('settings').doc('organisations').get();
  return doc.exists ? (doc.data().list || []) : [];
}

async function addOrganisation(name, type) {
  const list = await getOrganisations();
  list.push({ id: 'org_' + Date.now(), name, type, createdAt: new Date().toISOString() });
  await db.collection('settings').doc('organisations').set({ list });
}

async function deleteOrganisation(orgId) {
  let list = await getOrganisations();
  list = list.filter(o => o.id !== orgId);
  await db.collection('settings').doc('organisations').set({ list });
}

// ===== UI HELPERS =====
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function renderUserBadge() {
  const user = getCurrentUser();
  if (!user) return;
  const badgeText = document.getElementById('user-badge-text');
  if (badgeText) badgeText.textContent = user.identifier;

  const adminLink = document.getElementById('nav-admin-link');
  if (adminLink) adminLink.style.display = user.role === 'admin' ? 'flex' : 'none';
}