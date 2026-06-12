// ===== db.js — Local Storage Version (No Firebase) =====

// --- HELPER ---
function generateId() {
  return 'id_' + Math.random().toString(36).substr(2, 9);
}

// --- AUTHENTICATION ---
function getCurrentUser() {
  const user = sessionStorage.getItem('idc_current_user') || localStorage.getItem('currentUser');
  return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
  sessionStorage.setItem('idc_current_user', JSON.stringify(user));
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearCurrentUser() {
  sessionStorage.removeItem('idc_current_user');
  localStorage.removeItem('currentUser');
}

function logout() {
  clearCurrentUser();
  window.location.href = 'index.html';
}

function requireAuth() {
  const user = getCurrentUser();
  if (!user) { window.location.href = 'index.html'; return null; }
  return user;
}

function requireAdmin() {
  const user = requireAuth();
  if (user && user.role !== 'admin') { window.location.href = 'dashboard.html'; return null; }
  return user;
}

async function getUsers() {
  return JSON.parse(localStorage.getItem('idc_users') || '[]');
}

async function addUser(user) {
  const users = await getUsers();
  users.push(user);
  localStorage.setItem('idc_users', JSON.stringify(users));
}

async function deleteUser(userId) {
  let users = await getUsers();
  users = users.filter(u => u.id !== userId && u.identifier !== userId);
  localStorage.setItem('idc_users', JSON.stringify(users));
  return true;
}

// --- RECORDS MANAGEMENT ---
function getRecordsSync() {
  return JSON.parse(localStorage.getItem('idc_records') || '[]');
}

async function getRecords() {
  return getRecordsSync();
}

async function addRecord(data) {
  const records = getRecordsSync();
  const newRecord = { id: generateId(), ...data, createdAt: new Date().toISOString() };
  records.push(newRecord);
  localStorage.setItem('idc_records', JSON.stringify(records));
  return newRecord;
}

async function updateRecord(id, data) {
  const records = getRecordsSync();
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem('idc_records', JSON.stringify(records));
  }
}

async function deleteRecord(id) {
  let records = getRecordsSync();
  records = records.filter(r => r.id !== id);
  localStorage.setItem('idc_records', JSON.stringify(records));
  await deletePhoto(id);
}

async function getRecordById(id) {
  const records = getRecordsSync();
  return records.find(r => r.id === id) || null;
}

// --- PHOTO STORAGE (IndexedDB) ---
const dbName = "IDCardCollectorDB";
function openPhotoDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = e => { e.target.result.createObjectStore("photos"); };
    request.onsuccess = e => resolve(e.target.result);
    request.onerror = e => reject(e);
  });
}

async function savePhoto(recordId, blobOrFile) {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(blobOrFile, recordId);
    tx.oncomplete = async () => {
      await updateRecord(recordId, { hasPhoto: true });
      resolve('local');
    };
    tx.onerror = e => reject(e);
  });
}

async function getPhoto(recordId) {
  const db = await openPhotoDB();
  return new Promise((resolve) => {
    const tx = db.transaction("photos", "readonly");
    const req = tx.objectStore("photos").get(recordId);
    req.onsuccess = () => resolve(req.result ? URL.createObjectURL(req.result) : null);
    req.onerror = () => resolve(null);
  });
}

async function deletePhoto(recordId) {
  const db = await openPhotoDB();
  return new Promise((resolve) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").delete(recordId);
    tx.oncomplete = () => resolve();
  });
}

// --- TRANSACTIONS / COUNTER ---
async function getNextPhotoNumber() {
  let current = parseInt(localStorage.getItem('idc_counter') || '0', 10);
  current++;
  if (current > 999) current = 1;
  localStorage.setItem('idc_counter', current.toString());
  return String(current).padStart(3, '0');
}

async function getCurrentPhotoNumber() {
  return parseInt(localStorage.getItem('idc_counter') || '0', 10);
}

// --- SETTINGS & ORGANISATIONS ---
async function getCustomFields() {
  return JSON.parse(localStorage.getItem('idc_custom_fields') || '[]');
}

async function saveCustomFields(fields) {
  localStorage.setItem('idc_custom_fields', JSON.stringify(fields));
}

async function getOrganisations() {
  return JSON.parse(localStorage.getItem('idc_organisations') || '[]');
}

async function addOrganisation(name, type) {
  const list = await getOrganisations();
  list.push({ id: 'org_' + Date.now(), name, type, createdAt: new Date().toISOString() });
  localStorage.setItem('idc_organisations', JSON.stringify(list));
}

async function deleteOrganisation(orgId) {
  let list = await getOrganisations();
  list = list.filter(o => o.id !== orgId);
  localStorage.setItem('idc_organisations', JSON.stringify(list));
}

// --- UI HELPERS ---
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span></span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function renderUserBadge() {
  const user = getCurrentUser();
  if (!user) return;
  const badge = document.getElementById('user-badge-text');
  const avatar = document.getElementById('user-avatar');
  if (badge) badge.textContent = user.identifier.length > 20 ? user.identifier.slice(0, 18) + '…' : user.identifier;
  if (avatar) avatar.textContent = user.identifier[0].toUpperCase();
  
  const adminLink = document.getElementById('nav-admin-link');
  const settingsLink = document.querySelector('a[href="settings.html"]');
  const importLink = document.querySelector('a[href="import.html"]');
  const isAdmin = user.role === 'admin';
  
  if (adminLink) adminLink.style.display = isAdmin ? 'flex' : 'none';
  if (settingsLink && settingsLink.parentElement) settingsLink.parentElement.style.display = isAdmin ? 'block' : 'none';
  if (importLink && importLink.parentElement) importLink.parentElement.style.display = isAdmin ? 'block' : 'none';
}
