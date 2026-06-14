// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
const auth = getAuth(app);

let currentUser = null;
let userDocRef = null;
let userData = null;
let allTasks = [];

// ===== MAGIC LINK SETTINGS =====
const actionCodeSettings = {
  url: 'https://abdulhakeemkhalid19-spec.github.io/ver/dashboard.html',
  handleCodeInApp: true,
};

// ===== SEND MAGIC LINK =====
window.sendMagicLink = async function () {
  const email = document.getElementById('login-email').value.trim();
  const errorBox = document.getElementById('login-error');
  const successBox = document.getElementById('login-success');
  const btnText = document.getElementById('login-btn-text');

  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  if (!email || !email.includes('@')) {
    errorBox.textContent = '⚠️ Please enter a valid email address.';
    errorBox.style.display = 'block';
    return;
  }

  try {
    // Check if email is registered
    const q = query(collection(db, 'airdrop_participants'), where('email', '==', email));
    const snap = await getDocs(q);

    if (snap.empty) {
      errorBox.textContent = '⚠️ This email is not registered. Please register first.';
      errorBox.style.display = 'block';
      return;
    }

    btnText.textContent = 'Sending...';
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('verEmailForSignIn', email);

    successBox.innerHTML = `✅ Magic link sent to <strong>${email}</strong>! Check your inbox and click the link to login.`;
    successBox.style.display = 'block';
    btnText.textContent = 'Send Magic Link';

  } catch (err) {
    errorBox.textContent = `❌ Error: ${err.message}`;
    errorBox.style.display = 'block';
    btnText.textContent = 'Send Magic Link';
  }
}

// ===== HANDLE MAGIC LINK =====
async function handleMagicLink() {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('verEmailForSignIn');
    if (!email) {
      email = window.prompt('Please enter your email to confirm login:');
    }
    try {
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('verEmailForSignIn');
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error('Magic link error:', err);
    }
  }
}

// ===== AUTH STATE =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadUserData(user.email);
    await loadTasks();
    showDashboard();
  } else {
    showLogin();
  }
});

// ===== LOAD USER DATA =====
async function loadUserData(email) {
  const q = query(collection(db, 'airdrop_participants'), where('email', '==', email));
  const snap = await getDocs(q);
  if (!snap.empty) {
    userDocRef = snap.docs[0].ref;
    userData = snap.docs[0].data();
  }
}

// ===== LOAD TASKS FROM FIREBASE =====
async function loadTasks() {
  try {
    const snap = await getDocs(collection(db, 'tasks'));
    allTasks = [];
    snap.forEach(docSnap => {
      allTasks.push({ id: docSnap.id, ...docSnap.data() });
    });
  } catch (err) {
    console.error('Error loading tasks:', err);
  }
}

// ===== RENDER TASKS =====
function renderTasks() {
  const grid = document.getElementById('task-grid');
  const completed = userData?.tasks_completed || [];

  // Filter only active tasks
  const activeTasks = allTasks.filter(t => t.active);

  if (activeTasks.length === 0) {
    grid.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--text-muted);">
        🔜 New tasks coming soon! Check back later.
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  activeTasks.forEach(task => {
    const isDone = completed.includes(task.taskId);
    grid.innerHTML += `
      <div class="task-card ${isDone ? 'completed' : ''}" id="task-${task.taskId}">
        <div class="task-card-icon">${task.icon || '📌'}</div>
        <div class="task-card-info">
          <strong>${task.name}</strong>
          <span class="task-reward">+${task.points} $VER</span>
        </div>
        ${isDone
          ? `<button class="task-btn done" disabled>✅ Done</button>`
          : `<button class="task-btn" onclick="doTask('${task.taskId}', ${task.points}, '${task.url}')">Go</button>`
        }
      </div>
    `;
  });

  // Always show referral task at bottom
  grid.innerHTML += `
    <div class="task-card referral-task">
      <div class="task-card-icon">👥</div>
      <div class="task-card-info">
        <strong>Refer a Friend</strong>
        <span class="task-reward">+200 $VER per referral</span>
      </div>
      <button class="task-btn" onclick="copyReferral()">Copy Link</button>
    </div>
  `;
}

// ===== SHOW DASHBOARD =====
function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard-screen').style.display = 'block';

  if (!userData) return;

  document.getElementById('user-name').textContent = userData.fullname?.split(' ')[0] || 'User';
  document.getElementById('total-points').textContent = userData.ver_points || 0;
  document.getElementById('nav-points').textContent = userData.ver_points || 0;
  document.getElementById('tasks-done').textContent = (userData.tasks_completed || []).length;
  document.getElementById('user-tier').textContent = userData.tier || 'Bronze';
  document.getElementById('referral-count').textContent = userData.referral_count || 0;

  const refLink = `https://abdulhakeemkhalid19-spec.github.io/ver/?ref=${userData.my_referral_code}`;
  document.getElementById('referral-link-display').textContent = refLink;

  updateProgress(userData.referral_count || 0, userData.tier || 'Bronze');
  renderTasks();
}

// ===== SHOW LOGIN =====
function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('dashboard-screen').style.display = 'none';
}

// ===== DO TASK =====
window.doTask = async function (taskId, points, url) {
  if (!userData || !userDocRef) return;

  const completed = userData.tasks_completed || [];
  if (completed.includes(taskId)) {
    alert('✅ You already completed this task!');
    return;
  }

  // Open the task link
  window.open(url, '_blank');

  // Wait 5 seconds then ask for confirmation
  setTimeout(async () => {
    const confirmed = confirm(`Did you complete the task? Click OK to claim your ${points} $VER!`);
    if (!confirmed) return;

    const newCompleted = [...completed, taskId];
    const newPoints = (userData.ver_points || 0) + points;

    await updateDoc(userDocRef, {
      tasks_completed: newCompleted,
      ver_points: newPoints
    });

    userData.tasks_completed = newCompleted;
    userData.ver_points = newPoints;

    // Update UI
    document.getElementById('total-points').textContent = newPoints;
    document.getElementById('nav-points').textContent = newPoints;
    document.getElementById('tasks-done').textContent = newCompleted.length;
    updateProgress(userData.referral_count || 0, userData.tier || 'Bronze');
    renderTasks();

    alert(`🎉 +${points} $VER added to your account!`);
  }, 5000);
}

// ===== UPDATE PROGRESS =====
function updateProgress(referralCount, tier) {
  let target, current, nextTier;

  if (tier === 'Bronze') {
    target = 3; current = referralCount; nextTier = 'Silver';
  } else if (tier === 'Silver') {
    target = 10; current = referralCount; nextTier = 'Gold';
  } else if (tier === 'Gold') {
    target = 20; current = referralCount; nextTier = 'Diamond';
  } else {
    target = 1; current = 1; nextTier = 'Diamond';
  }

  const percent = Math.min((current / target) * 100, 100);
  document.getElementById('progress-fill').style.width = `${percent}%`;
  document.getElementById('progress-text').textContent =
    tier === 'Diamond'
      ? '💎 Max tier reached!'
      : `${current} / ${target} referrals to ${nextTier}`;
}

// ===== COPY REFERRAL =====
window.copyReferral = function () {
  if (!userData) return;
  const refLink = `https://abdulhakeemkhalid19-spec.github.io/ver/?ref=${userData.my_referral_code}`;
  navigator.clipboard.writeText(refLink).then(() => {
    alert('✅ Referral link copied!');
  });
}

// ===== LOGOUT =====
window.logout = async function () {
  await signOut(auth);
  showLogin();
}

// ===== INIT =====
handleMagicLink();
