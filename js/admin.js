// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// ===== SET YOUR ADMIN PASSWORD HERE =====
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

  // Allow pressing Enter to login
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
  await loadTasks();
  await loadParticipants();
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
        <div class="task-list-item" id="task-item-${id}">
          <div class="task-list-icon">${task.icon || '📌'}</div>
          <div class="task-list-info">
            <strong>${task.name}</strong>
            <span>ID: ${task.taskId} &nbsp;|&nbsp; <a href="${task.url}" target="_blank" style="color:var(--primary)">${task.url}</a></span>
          </div>
          <div class="task-list-reward">+${task.points} $VER</div>
          <span class="task-status ${task.active ? 'active' : 'inactive'}">
            ${task.active ? '✅ Active' : '⏸ Paused'}
          </span>
          <div class="task-actions">
            <button class="btn-toggle ${task.active ? 'active' : ''}" onclick="toggleTask('${id}', ${task.active})">
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
  const taskId = document.getElementById('task-id').value.trim().replace(/\s+/g, '_').toLowerCase();

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

    // Clear form
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

// ===== TOGGLE TASK ACTIVE/PAUSE =====
window.toggleTask = async function (docId, currentActive) {
  try {
    await updateDoc(doc(db, 'tasks', docId), {
      active: !currentActive
    });
    await loadTasks();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ===== DELETE TASK =====
window.deleteTask = async function (docId) {
  const confirmed = confirm('Are you sure you want to delete this task? This cannot be undone.');
  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, 'tasks', docId));
    await loadTasks();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// ===== LOAD PARTICIPANTS =====
async function loadParticipants() {
  const tbody = document.getElementById('participants-body');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Loading...</td></tr>';

  try {
    const snap = await getDocs(collection(db, 'airdrop_participants'));

    document.getElementById('stat-participants').textContent = snap.size;

    let totalVer = 0;
    snap.forEach(d => { totalVer += d.data().ver_points || 0; });
    document.getElementById('stat-ver').textContent = totalVer.toLocaleString();

    if (snap.empty) {
      tbody.innerHTML = '<tr><td colspan="8" class="loading-text">No participants yet.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    snap.forEach(docSnap => {
      const p = docSnap.data();
      const date = p.registered_at ? new Date(p.registered_at).toLocaleDateString() : '—';
      tbody.innerHTML += `
        <tr>
          <td>${p.fullname || '—'}</td>
          <td>${p.email || '—'}</td>
          <td>${p.telegram || '—'}</td>
          <td style="font-size:0.78rem">${p.wallet ? p.wallet.slice(0,8)+'...'+p.wallet.slice(-6) : '—'}</td>
          <td><strong style="color:var(--primary)">${p.ver_points || 0}</strong></td>
          <td><span class="tier-badge tier-${p.tier || 'Bronze'}">${p.tier || 'Bronze'}</span></td>
          <td>${p.referral_count || 0}</td>
          <td>${date}</td>
        </tr>
      `;
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-text">Error: ${err.message}</td></tr>`;
  }
      }
