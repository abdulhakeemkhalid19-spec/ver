// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

let userData = null;
let userDocRef = null;
let allTasks = [];
let miningActive = false;

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
  // Handle magic link
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('verEmailForSignIn');
    if (!email) email = window.prompt('Enter your email to confirm login:');
    try {
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('verEmailForSignIn');
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error(err);
    }
  }
});

// ===== AUTH STATE =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadUserData(user.email);
    await loadTasks();
    await loadMiningStatus();
    await loadNews();
    renderDashboard();
  } else {
    window.location.href = 'login.html';
  }
});

// ===== LOAD USER DATA =====
async function loadUserData(email) {
  const q = query(
    collection(db, 'airdrop_participants'),
    where('email', '==', email)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    userDocRef = snap.docs[0].ref;
    userData = snap.docs[0].data();
  } else {
    window.location.href = 'register.html';
  }
}

// ===== LOAD TASKS =====
async function loadTasks() {
  try {
    const snap = await getDocs(collection(db, 'tasks'));
    allTasks = [];
    snap.forEach(d => allTasks.push({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Tasks error:', err);
  }
}

// ===== LOAD MINING STATUS =====
async function loadMiningStatus() {
  try {
    const snap = await getDocs(collection(db, 'settings'));
    snap.forEach(d => {
      if (d.id === 'mining') {
        miningActive = d.data().active || false;
      }
    });
  } catch (err) {
    console.error('Mining status error:', err);
  }
}

// ===== LOAD NEWS =====
async function loadNews() {
  try {
    const snap = await getDocs(collection(db, 'news'));
    const newsList = document.getElementById('news-list');
    if (snap.empty) {
      newsList.innerHTML = `
        <div class="task-loading">
          📭 No announcements yet. Check back soon!
        </div>`;
      return;
    }

    // Sort by date newest first
    const news = [];
    snap.forEach(d => news.push({ id: d.id, ...d.data() }));
    news.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    newsList.innerHTML = '';
    news.forEach(item => {
      const date = new Date(item.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      newsList.innerHTML += `
        <div class="news-card">
          <span class="news-tag ${item.tag}">${getNewsTagLabel(item.tag)}</span>
          <h3>${item.title}</h3>
          <p>${item.body}</p>
          <span class="news-date">📅 ${date}</span>
        </div>
      `;
    });
  } catch (err) {
    console.error('News error:', err);
  }
}

function getNewsTagLabel(tag) {
  const labels = {
    announcement: '📢 Announcement',
    update: '🔄 Update',
    mining: '⛏️ Mining',
    listing: '🚀 Listing'
  };
  return labels[tag] || '📢 Announcement';
}

// ===== RENDER DASHBOARD =====
function renderDashboard() {
  if (!userData) return;

  const name = userData.fullname || userData.username || 'User';
  const firstName = name.split(' ')[0];
  const points = userData.ver_points || 0;
  const referralCount = userData.referral_count || 0;
  const referralEarnings = userData.referral_earnings || 0;
  const tasksDone = (userData.tasks_completed || []).length;
  const tier = userData.tier || 'Bronze';
  const refCode = userData.my_referral_code || '------';
  const wallet = userData.wallet || 'Not set';
  const refLink = `https://abdulhakeemkhalid19-spec.github.io/ver/register.html?ref=${refCode}`;

  // ===== TOP NAVBAR =====
  document.getElementById('dash-username').textContent = `@${userData.username || firstName}`;
  document.getElementById('nav-bal-num').textContent = points.toLocaleString();

  // ===== HOME TAB =====
  document.getElementById('profile-avatar').textContent = firstName.charAt(0).toUpperCase();
  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-username').textContent = `@${userData.username || firstName}`;
  document.getElementById('profile-tier-badge').textContent = getTierEmoji(tier) + ' ' + tier;
  document.getElementById('home-balance').textContent = points.toLocaleString();
  document.getElementById('home-tasks-done').textContent = tasksDone;
  document.getElementById('home-referrals').textContent = referralCount;
  document.getElementById('home-tier').textContent = tier;
  document.getElementById('home-wallet').textContent = wallet;
  document.getElementById('home-ref-code').textContent = refCode;

  // Progress bar
  updateProgress(referralCount, tier);

  // Phase banner
  if (miningActive) {
    document.getElementById('phase-banner').style.display = 'none';
  }

  // ===== TASKS TAB =====
  renderTasks();

  // Mining section
  if (miningActive) {
    document.getElementById('mining-section').style.display = 'block';
    checkMiningTimer();
  }

  // ===== REFERRAL TAB =====
  document.getElementById('ref-count').textContent = referralCount;
  document.getElementById('ref-earned').textContent = referralEarnings.toLocaleString();
  document.getElementById('ref-link-box').textContent = refLink;
  document.getElementById('ref-code-display').textContent = refCode;
}

// ===== RENDER TASKS =====
function renderTasks() {
  const grid = document.getElementById('task-grid');
  const completed = userData?.tasks_completed || [];
  const activeTasks = allTasks.filter(t => t.active);

  if (activeTasks.length === 0) {
    grid.innerHTML = `
      <div class="task-loading">
        🔜 New tasks coming soon! Check back later.
      </div>`;
    return;
  }

  grid.innerHTML = '';
  activeTasks.forEach(task => {
    const isDone = completed.includes(task.taskId);
    grid.innerHTML += `
      <div class="task-card ${isDone ? 'completed' : ''}">
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

  // Referral task always at bottom
  grid.innerHTML += `
    <div class="task-card" style="border-color:rgba(0,245,160,0.3);">
      <div class="task-card-icon">👥</div>
      <div class="task-card-info">
        <strong>Refer a Friend</strong>
        <span class="task-reward">+200–500 $VER per referral</span>
      </div>
      <button class="task-btn" onclick="switchTab('referral')">Share</button>
    </div>
  `;
}

// ===== DO TASK =====
window.doTask = async function (taskId, points, url) {
  if (!userData || !userDocRef) return;
  const completed = userData.tasks_completed || [];

  if (completed.includes(taskId)) {
    alert('✅ You already completed this task!');
    return;
  }

  window.open(url, '_blank');

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

    document.getElementById('home-balance').textContent = newPoints.toLocaleString();
    document.getElementById('nav-bal-num').textContent = newPoints.toLocaleString();
    document.getElementById('home-tasks-done').textContent = newCompleted.length;
    renderTasks();

    alert(`🎉 +${points} $VER added to your account!`);
  }, 5000);
}

// ===== MINING =====
window.doMining = async function () {
  if (!userData || !userDocRef) return;

  const lastMined = userData.last_mined;
  const now = new Date();

  if (lastMined) {
    const last = new Date(lastMined);
    const diffHours = (now - last) / (1000 * 60 * 60);
    if (diffHours < 24) {
      const hoursLeft = Math.ceil(24 - diffHours);
      alert(`⏳ You already mined today! Come back in ${hoursLeft} hour(s).`);
      return;
    }
  }

  const miningReward = 50;
  const newPoints = (userData.ver_points || 0) + miningReward;

  await updateDoc(userDocRef, {
    ver_points: newPoints,
    last_mined: now.toISOString(),
    mining_total: (userData.mining_total || 0) + miningReward
  });

  userData.ver_points = newPoints;
  userData.last_mined = now.toISOString();

  document.getElementById('home-balance').textContent = newPoints.toLocaleString();
  document.getElementById('nav-bal-num').textContent = newPoints.toLocaleString();
  document.getElementById('mining-balance').textContent = `${miningReward} $VER mined today`;

  const btn = document.getElementById('mine-btn');
  btn.disabled = true;
  btn.textContent = '✅ Mined Today!';
  document.getElementById('mining-timer').textContent = 'Come back in 24 hours to mine again!';

  alert(`⛏️ You mined ${miningReward} $VER! Come back tomorrow for more.`);
}

// ===== CHECK MINING TIMER =====
function checkMiningTimer() {
  if (!userData?.last_mined) return;
  const last = new Date(userData.last_mined);
  const now = new Date();
  const diffHours = (now - last) / (1000 * 60 * 60);

  if (diffHours < 24) {
    const btn = document.getElementById('mine-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '✅ Mined Today!';
      const hoursLeft = Math.ceil(24 - diffHours);
      document.getElementById('mining-timer').textContent =
        `⏳ Next mining in ${hoursLeft} hour(s)`;
    }
  }
}

// ===== UPDATE PROGRESS =====
function updateProgress(referralCount, tier) {
  let target, current, nextTier;
  if (tier === 'Bronze') { target = 3; current = referralCount; nextTier = 'Silver'; }
  else if (tier === 'Silver') { target = 10; current = referralCount; nextTier = 'Gold'; }
  else if (tier === 'Gold') { target = 20; current = referralCount; nextTier = 'Diamond'; }
  else { target = 1; current = 1; nextTier = 'Diamond'; }

  const percent = Math.min((current / target) * 100, 100);
  document.getElementById('home-progress-fill').style.width = `${percent}%`;
  document.getElementById('home-progress-text').textContent =
    tier === 'Diamond' ? '💎 Max tier reached!' : `${current}/${target} to ${nextTier}`;
}

// ===== TIER EMOJI =====
function getTierEmoji(tier) {
  const emojis = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Diamond: '💎' };
  return emojis[tier] || '🥉';
}

// ===== COPY REFERRAL LINK =====
window.copyRefLink = function () {
  if (!userData) return;
  const refLink = `https://abdulhakeemkhalid19-spec.github.io/ver/register.html?ref=${userData.my_referral_code}`;
  navigator.clipboard.writeText(refLink).then(() => {
    alert('✅ Referral link copied!');
  });
}

// ===== SHARE REFERRAL LINK =====
window.shareRefLink = function () {
  if (!userData) return;
  const refLink = `https://abdulhakeemkhalid19-spec.github.io/ver/register.html?ref=${userData.my_referral_code}`;
  if (navigator.share) {
    navigator.share({
      title: '$VER Airdrop',
      text: `Join the $VER airdrop and earn free tokens before listing! Use my referral link:`,
      url: refLink
    });
  } else {
    copyRefLink();
  }
}

// ===== SWITCH TAB =====
window.switchTab = function (tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`tab-btn-${tab}`).classList.add('active');
}

// ===== HAMBURGER MENU =====
window.toggleDashMenu = function () {
  document.getElementById('dash-side-menu').classList.toggle('open');
  document.getElementById('dash-overlay').classList.toggle('open');
  document.body.classList.toggle('no-scroll');
}

// ===== LOGOUT =====
window.logoutUser = async function () {
  const confirmed = confirm('Are you sure you want to logout?');
  if (!confirmed) return;
  await signOut(auth);
  window.location.href = 'login.html';
    }
