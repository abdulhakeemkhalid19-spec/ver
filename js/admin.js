// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAnrHeyZzd2OucQw2yAKAUBzBwot76Koh0",
  authDomain: "ver-airdrop.firebaseapp.com",
  projectId: "ver-airdrop",
  storageBucket: "ver-airdrop.firebasestorage.app",
  messagingSenderId: "864554971852",
  appId: "1:864554971852:web:9afd806aa3be38669f0869"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== CHANGE THIS TO YOUR OWN PASSWORD =====
const ADMIN_PASSWORD = "VER@Admin2025";

// ===== PASSWORD CHECK =====
window.checkPassword = function () {
  const input = document.getElementById('admin-password').value;
  const errorBox = document.getElementById('pass-error');

  if (input === ADMIN_PASSWORD) {
    sessionStorage.setItem('ver_admin', 'true');
    document.getElementById('password-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadAll();
  } else {
    errorBox.style.display = 'block';
    document.getElementById('admin-password').value = '';
  }
}

// ===== AUTO LOGIN IF SESSION EXISTS =====
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('ver_admin') === 'true') {
    document.getElementById('password-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadAll();
  }

  document.getElementById('admin-password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPassword();
  });
});

// ===== LOGOUT =====
window.adminLogout = function () {
  sessionStorage.removeItem('ver_admin');
  document.getElementById('password-screen').style.display = 'flex';
  document.getElementById('admin-dashboard').style.display = 'none';
  document.getElementById('admin-password').value = '';
}

// ===== LOAD EVERYTHING =====
async function loadAll() {
  await loadMiningStatus();
  await loadTasks();
  await loadNews();
  await loadParticipants();
}

// ===== MINING TOGGLE =====
async function loadMiningStatus() {
  try {
    const snap = await getDocs(collection(db, 'settings'));
    snap.forEach(d => {
      if (d.id === 'mining') {
        const active = d.data().active || false;
        document.getElementById('mining-toggle').checked = active;
        document.getElementById('mining-status-text').textContent = active ? '🟢 ON' : '⚫ OFF';
      }
    });
  } catch (err) {
    console.error('Mining status error:', err);
  }
}

window.toggleMining = async function () {
  const isActive = document.getElementById('mining-toggle').checked;
  try {
    await setDoc(doc(db, 'settings', 'mining'), {
      active: isActive,
      updatedAt: new Date().toISOString()
    });
    document.getElementById('mining-status-text').textContent = isActive ? '🟢 ON' : '⚫ OFF';
    alert(`⛏️ Mining has been ${isActive ? 'ACTIVATED' : 'DEACTIVATED'} for all users!`);
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ===== LOAD TASKS =====
async function loadTasks() {
  const tasksList = document.getElementById('tasks-list');
  tasksList.innerHTML = '<p class="loading-text">Loading tasks...</p>';

  try {
    const snap = await getDocs(collection(db, 'tasks'));
    document.getElementById('stat-tasks').textContent = snap.size;

    if (snap.empty) {
      tasksList.innerHTML = '<p class="loading-text">No tasks yet. Add your first task above!</p>';
      return;
    }

    tasksList.innerHTML = '';
    snap.forEach(docSnap => {
      const task = docSnap.data();
      const id = docSnap.id;
      tasksList.innerHTML += `
        <div class="task-list-item">
          <div class="task-list-icon">${task.icon || '📌'}</div>
          <div class="task-list-info">
            <strong>${task.name}</strong>
            <span>ID: ${task.taskId} &nbsp;|&nbsp;
              <a href="${task.url}" target="_blank">${task.url}</a>
            </span>
          </div>
          <div class="task-list-reward">+${task.points} $VER</div>
          <span class="task-status ${task.active ? 'active' : 'inactive'}">
            ${task.active ? '✅ Active' : '⏸ Paused'}
          </span>
          <div class="task-actions">
            <button class="btn-toggle" onclick="toggleTask('${id}', ${task.active})">
              ${task.active ? 'Pause' : 'Activate'}
            </button>
            <button class="btn-delete" onclick="deleteTask('${id}')">Delete</button>
          </div>
        </div>
      `;
    });
  } catch (err) {
    tasksList.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
  }
}

// ===== ADD TASK =====
window.addTask = async function () {
  const name = document.getElementById('task-name').value.trim();
  const icon = document.getElementById('task-icon').value.trim();
  const url = document.getElementById('task-url').value.trim();
  const points = parseInt(document.getElementById('task-points').value);
  const taskId = document.getElementById('task-id').value.trim()
    .replace(/\s+/g, '_').toLowerCase();

  const errorBox = document.getElementById('task-form-error');
  const successBox = document.getElementById('task-form-success');
  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  if (!name || !url || !points || !taskId) {
    errorBox.textContent = '⚠️ Please fill in all fields.';
    errorBox.style.display = 'block';
    return;
  }

  if (isNaN(points) || points <= 0) {
    errorBox.textContent = '⚠️ Please enter a valid reward amount.';
    errorBox.style.display = 'block';
    return;
  }

  try {
    await addDoc(collection(db, 'tasks'), {
      name,
      icon: icon || '📌',
      url,
      points,
      taskId,
      active: true,
      createdAt: new Date().toISOString()
    });

    successBox.textContent = `✅ Task "${name}" added successfully!`;
    successBox.style.display = 'block';

    document.getElementById('task-name').value = '';
    document.getElementById('task-icon').value = '';
    document.getElementById('task-url').value = '';
    document.getElementById('task-points').value = '';
    document.getElementById('task-id').value = '';

    await loadTasks();

  } catch (err) {
    errorBox.textContent = `❌ Error: ${err.message}`;
    errorBox.style.display = 'block';
  }
}

// ===== TOGGLE TASK =====
window.toggleTask = async function (docId, currentActive) {
  try {
    await updateDoc(doc(db, 'tasks', docId), { active: !currentActive });
    await loadTasks();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ===== DELETE TASK =====
window.deleteTask = async function (docId) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  try {
    await deleteDoc(doc(db, 'tasks', docId));
    await loadTasks();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ===== POST NEWS =====
window.postNews = async function () {
  const title = document.getElementById('news-title').value.trim();
  const body = document.getElementById('news-body').value.trim();
  const tag = document.getElementById('news-tag').value;

  const errorBox = document.getElementById('news-form-error');
  const successBox = document.getElementById('news-form-success');
  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  if (!title || !body) {
    errorBox.textContent = '⚠️ Please fill in title and message.';
    errorBox.style.display = 'block';
    return;
  }

  try {
    await addDoc(collection(db, 'news'), {
      title,
      body,
      tag,
      createdAt: new Date().toISOString()
    });

    successBox.textContent = `✅ News "${title}" posted successfully!`;
    successBox.style.display = 'block';

    document.getElementById('news-title').value = '';
    document.getElementById('news-body').value = '';

    await loadNews();

  } catch (err) {
    errorBox.textContent = `❌ Error: ${err.message}`;
    errorBox.style.display = 'block';
  }
}

// ===== LOAD NEWS =====
async function loadNews() {
  const newsList = document.getElementById('news-list');
  newsList.innerHTML = '<p class="loading-text">Loading...</p>';

  try {
    const snap = await getDocs(collection(db, 'news'));
    document.getElementById('stat-news').textContent = snap.size;

    if (snap.empty) {
      newsList.innerHTML = '<p class="loading-text">No news posted yet.</p>';
      return;
    }

    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    newsList.innerHTML = '';
    items.forEach(item => {
      const date = new Date(item.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      newsList.innerHTML += `
        <div class="news-list-item">
          <div class="news-list-info">
            <strong>${item.title}</strong>
            <p>${item.body}</p>
            <small>📅 ${date} &nbsp;|&nbsp; Tag: ${item.tag}</small>
          </div>
          <button class="btn-delete" onclick="deleteNews('${item.id}')">Delete</button>
        </div>
      `;
    });
  } catch (err) {
    newsList.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
  }
}

// ===== DELETE NEWS =====
window.deleteNews = async function (docId) {
  if (!confirm('Delete this news post?')) return;
  try {
    await deleteDoc(doc(db, 'news', docId));
    await loadNews();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ===== LOAD PARTICIPANTS =====
async function loadParticipants() {
  const tbody = document.getElementById('participants-body');
  tbody.innerHTML = '<tr><td colspan="10" class="loading-text">Loading...</td></tr>';

  try {
    const snap = await getDocs(collection(db, 'airdrop_participants'));
    document.getElementById('stat-participants').textContent = snap.size;

    let totalVer = 0;
    snap.forEach(d => { totalVer += d.data().ver_points || 0; });
    document.getElementById('stat-ver').textContent = totalVer.toLocaleString();

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="10" class="loading-text">No participants yet.</td></tr>';
      return;
    }

    const participants = [];
    snap.forEach(d => participants.push({ id: d.id, ...d.data() }));
    participants.sort((a, b) => new Date(b.registered_at) - new Date(a.registered_at));

    tbody.innerHTML = '';
    participants.forEach(p => {
      const date = p.registered_at
        ? new Date(p.registered_at).toLocaleDateString() : '—';
      const wallet = p.wallet
        ? p.wallet.slice(0, 6) + '...' + p.wallet.slice(-4) : '—';
      tbody.innerHTML += `
        <tr>
          <td>${p.fullname || p.username || '—'}</td>
          <td>${p.email || '—'}</td>
          <td>${p.username || '—'}</td>
          <td>${p.telegram || '—'}</td>
          <td>${p.twitter || '—'}</td>
          <td title="${p.wallet || ''}">${wallet}</td>
          <td><strong style="color:var(--primary)">${(p.ver_points || 0).toLocaleString()}</strong></td>
          <td>
            <span class="tier-badge tier-${p.tier || 'Bronze'}">
              ${p.tier || 'Bronze'}
            </span>
          </td>
          <td>${p.referral_count || 0}</td>
          <td>${date}</td>
        </tr>
      `;
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="loading-text">Error: ${err.message}</td></tr>`;
  }
  }
