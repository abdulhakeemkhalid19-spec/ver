// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink, TwitterAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
const twitterProvider = new TwitterAuthProvider();

let userData = null;
let userDocRef = null;
let allTasks = [];
let miningActive = false;
let currentUser = null;
// Track tasks opened but not yet claimed
const pendingClaim = {};

// ===== INIT =====
window.addEventListener('DOMContentLoaded', async () => {
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

  // Telegram auth callback
  window.onTelegramAuth = async function (user) {
    await handleTelegramConnect(user);
  };
});

// ===== AUTH STATE =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadUserData(user.email);
    await loadTasks();
    await loadMiningStatus();
    await loadNews();
    if (userData) {
      renderDashboard();
      renderTelegramWidget();
    } else {
      window.location.href = 'register.html';
    }
  } else {
    window.location.href = 'login.html';
  }
});

// ===== LOAD USER DATA =====
async function loadUserData(email) {
  try {
    const emailLower = email.toLowerCase().trim();
    let q = query(collection(db, 'airdrop_participants'), where('email', '==', emailLower));
    let snap = await getDocs(q);
    if (snap.empty) {
      q = query(collection(db, 'airdrop_participants'), where('email', '==', email.trim()));
      snap = await getDocs(q);
    }
    if (!snap.empty) {
      userDocRef = snap.docs[0].ref;
      userData = snap.docs[0].data();
    }
  } catch (err) {
    console.error('Load user error:', err);
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
      if (d.id === 'mining') miningActive = d.data().active || false;
    });
  } catch (err) {
    console.error('Mining error:', err);
  }
}

// ===== LOAD NEWS =====
async function loadNews() {
  try {
    const snap = await getDocs(collection(db, 'news'));
    const newsList = document.getElementById('news-list');
    if (snap.empty) {
      newsList.innerHTML = `<div class="task-loading">📭 No announcements yet. Check back soon!</div>`;
      return;
    }
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
  const photoURL = userData.photoURL || currentUser?.photoURL || '';

  // TOP NAVBAR
  document.getElementById('dash-username').textContent = `@${userData.username || firstName}`;
  document.getElementById('nav-bal-num').textContent = points.toLocaleString();

  // NAV PROFILE PIC
  if (photoURL) {
    const navImg = document.getElementById('nav-profile-img');
    navImg.src = photoURL;
    navImg.style.display = 'block';
    document.getElementById('nav-profile-initial').style.display = 'none';
  } else {
    document.getElementById('nav-profile-initial').textContent = firstName.charAt(0).toUpperCase();
  }

  // PROFILE TAB
  if (photoURL) {
    const profilePic = document.getElementById('profile-pic');
    profilePic.src = photoURL;
    profilePic.style.display = 'block';
    document.getElementById('profile-initial-big').style.display = 'none';
  } else {
    document.getElementById('profile-initial-big').textContent = firstName.charAt(0).toUpperCase();
  }

  document.getElementById('profile-name-display').textContent = name;
  document.getElementById('profile-username-display').textContent = `@${userData.username || firstName}`;
  document.getElementById('profile-tier-tag').textContent = getTierEmoji(tier) + ' ' + tier;
  document.getElementById('profile-points').textContent = points.toLocaleString();
  document.getElementById('profile-tasks').textContent = tasksDone;
  document.getElementById('profile-refs').textContent = referralCount;
  document.getElementById('profile-wallet-display').textContent = wallet;
  document.getElementById('profile-ref-code').textContent = refCode;
  document.getElementById('edit-username-input').value = userData.username || name;
  document.getElementById('edit-wallet-input').value = userData.wallet || '';

  // X CONNECTION STATUS
  if (userData.twitter_connected) {
    document.getElementById('x-status-text').textContent = `✅ Connected: ${userData.twitter || ''}`;
    document.getElementById('connect-x-btn').textContent = '✅ Connected';
    document.getElementById('connect-x-btn').classList.add('connected');
    document.getElementById('connect-x-card').classList.add('connected');
  }

  // TELEGRAM CONNECTION STATUS
  if (userData.telegram_connected) {
    document.getElementById('telegram-status-text').textContent = `✅ Connected: ${userData.telegram || ''}`;
    document.getElementById('connect-telegram-card').classList.add('connected');
    document.getElementById('telegram-widget-wrap').innerHTML =
      `<span style="color:var(--primary);font-size:0.82rem;font-weight:700;">✅ Connected</span>`;
  }

  // HOME TAB
  document.getElementById('home-balance').textContent = points.toLocaleString();
  document.getElementById('home-tasks-done').textContent = tasksDone;
  document.getElementById('home-referrals').textContent = referralCount;
  document.getElementById('home-tier').textContent = tier;
  document.getElementById('home-wallet').textContent = wallet;
  document.getElementById('home-ref-code').textContent = refCode;

  updateProgress(referralCount, tier);

  if (miningActive) {
    document.getElementById('phase-banner').style.display = 'none';
    document.getElementById('mining-section').style.display = 'block';
    checkMiningTimer();
  }

  // REFERRAL TAB
  document.getElementById('ref-count').textContent = referralCount;
  document.getElementById('ref-earned').textContent = referralEarnings.toLocaleString();
  document.getElementById('ref-link-box').textContent = refLink;
  document.getElementById('ref-code-display').textContent = refCode;

  renderTasks();
}

// ===== RENDER TELEGRAM WIDGET =====
function renderTelegramWidget() {
  if (userData?.telegram_connected) return;
  const wrap = document.getElementById('telegram-login-btn');
  if (!wrap) return;
  wrap.innerHTML = `
    <button class="btn-connect-telegram" onclick="showTelegramWidget()">
      Connect Telegram
    </button>
  `;
}

window.showTelegramWidget = function () {
  const wrap = document.getElementById('telegram-login-btn');
  wrap.innerHTML = `
    <script async src="https://telegram.org/js/telegram-widget.js?22"
      data-telegram-login="VERAirdropBot"
      data-size="medium"
      data-onauth="onTelegramAuth(user)"
      data-request-access="write">
    <\/script>
  `;
}

// ===== HANDLE TELEGRAM CONNECT =====
async function handleTelegramConnect(telegramUser) {
  if (!userData || !userDocRef) return;

  const telegramUsername = '@' + (telegramUser.username || telegramUser.id);

  // Check if telegram already used by another account
  const q = query(
    collection(db, 'airdrop_participants'),
    where('telegram', '==', telegramUsername)
  );
  const snap = await getDocs(q);

  if (!snap.empty && snap.docs[0].id !== userDocRef.id) {
    alert('⚠️ This Telegram account is already connected to another $VER account. This action has been flagged.');
    await updateDoc(userDocRef, { flagged: true, flag_reason: 'Duplicate Telegram account' });
    return;
  }

  await updateDoc(userDocRef, {
    telegram: telegramUsername,
    telegram_connected: true,
    telegram_id: telegramUser.id,
    telegram_photo: telegramUser.photo_url || ''
  });

  userData.telegram = telegramUsername;
  userData.telegram_connected = true;

  document.getElementById('telegram-status-text').textContent = `✅ Connected: ${telegramUsername}`;
  document.getElementById('connect-telegram-card').classList.add('connected');
  document.getElementById('telegram-widget-wrap').innerHTML =
    `<span style="color:var(--primary);font-size:0.82rem;font-weight:700;">✅ Connected</span>`;

  alert(`✅ Telegram connected successfully as ${telegramUsername}!`);
}

// ===== CONNECT TWITTER =====
window.connectTwitter = async function () {
  if (userData?.twitter_connected) {
    alert('✅ Twitter/X is already connected!');
    return;
  }

  try {
    const result = await signInWithPopup(auth, twitterProvider);
    const twitterUsername = '@' + (result._tokenResponse?.screenName || '');

    // Check if twitter already used by another account
    const q = query(
      collection(db, 'airdrop_participants'),
      where('twitter', '==', twitterUsername)
    );
    const snap = await getDocs(q);

    if (!snap.empty && snap.docs[0].ref.id !== userDocRef.id) {
      alert('⚠️ This Twitter/X account is already connected to another $VER account. This action has been flagged.');
      await updateDoc(userDocRef, { flagged: true, flag_reason: 'Duplicate Twitter account' });
      return;
    }

    await updateDoc(userDocRef, {
      twitter: twitterUsername,
      twitter_connected: true,
      twitter_id: result.user.uid
    });

    userData.twitter = twitterUsername;
    userData.twitter_connected = true;

    document.getElementById('x-status-text').textContent = `✅ Connected: ${twitterUsername}`;
    document.getElementById('connect-x-btn').textContent = '✅ Connected';
    document.getElementById('connect-x-btn').classList.add('connected');
    document.getElementById('connect-x-card').classList.add('connected');

    alert(`✅ Twitter/X connected as ${twitterUsername}!`);

  } catch (err) {
    alert('❌ Twitter connect failed: ' + err.message);
  }
}

// ===== RENDER TASKS =====
function renderTasks() {
  const grid = document.getElementById('task-grid');
  const completed = userData?.tasks_completed || [];
  const activeTasks = allTasks.filter(t => t.active);

  if (activeTasks.length === 0) {
    grid.innerHTML = `<div class="task-loading">🔜 New tasks coming soon!</div>`;
    return;
  }

  grid.innerHTML = '';
  activeTasks.forEach(task => {
    const isDone = completed.includes(task.taskId);
    const isPending = pendingClaim[task.taskId];

    let btnHtml = '';
    if (isDone) {
      btnHtml = `<button class="task-btn done" disabled>✅ Done</button>`;
    } else if (isPending) {
      btnHtml = `<button class="task-btn claim" onclick="claimTask('${task.taskId}', ${task.points})">Claim</button>`;
    } else {
      btnHtml = `<button class="task-btn" onclick="goTask('${task.taskId}', ${task.points})">Go</button>`;
    }

    grid.innerHTML += `
      <div class="task-card ${isDone ? 'completed' : ''}">
        <div class="task-card-icon">${task.icon || '📌'}</div>
        <div class="task-card-info">
          <strong>${task.name}</strong>
          <span class="task-reward">+${task.points} $VER</span>
        </div>
        ${btnHtml}
      </div>
    `;
  });

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

// ===== GO TASK — Opens link then shows Claim =====
window.goTask = async function (taskId, points) {
  if (!userData || !userDocRef) return;
  const completed = userData.tasks_completed || [];
  if (completed.includes(taskId)) {
    alert('✅ Already completed!');
    return;
  }

  const task = allTasks.find(t => t.taskId === taskId);
  if (!task) return;

  // Open the task URL
  window.open(task.url, '_blank');

  // Mark as pending claim after 8 seconds
  setTimeout(() => {
    pendingClaim[taskId] = true;
    renderTasks();
  }, 8000);
}

// ===== CLAIM TASK — Credits $VER =====
window.claimTask = async function (taskId, points) {
  if (!userData || !userDocRef) return;
  const completed = userData.tasks_completed || [];
  if (completed.includes(taskId)) return;

  const newCompleted = [...completed, taskId];
  const newPoints = (userData.ver_points || 0) + points;

  try {
    await updateDoc(userDocRef, {
      tasks_completed: newCompleted,
      ver_points: newPoints
    });

    userData.tasks_completed = newCompleted;
    userData.ver_points = newPoints;
    delete pendingClaim[taskId];

    document.getElementById('home-balance').textContent = newPoints.toLocaleString();
    document.getElementById('nav-bal-num').textContent = newPoints.toLocaleString();
    document.getElementById('home-tasks-done').textContent = newCompleted.length;
    document.getElementById('profile-points').textContent = newPoints.toLocaleString();
    document.getElementById('profile-tasks').textContent = newCompleted.length;
    updateProgress(userData.referral_count || 0, userData.tier || 'Bronze');
    renderTasks();

    alert(`🎉 +${points} $VER claimed successfully!`);
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

// ===== EDIT USERNAME =====
window.toggleEditUsername = function () {
  const form = document.getElementById('edit-username-form');
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

window.saveUsername = async function () {
  const newUsername = document.getElementById('edit-username-input').value.trim();
  if (!newUsername) {
    alert('⚠️ Username cannot be empty!');
    return;
  }

  if (newUsername.length < 3) {
    alert('⚠️ Username must be at least 3 characters!');
    return;
  }

  try {
    // Generate new referral code from username
    const newRefCode = newUsername.toUpperCase().replace(/\s+/g, '').slice(0, 3) +
      Math.random().toString(36).substring(2, 5).toUpperCase();

    await updateDoc(userDocRef, {
      username: newUsername,
      fullname: newUsername,
      my_referral_code: newRefCode
    });

    userData.username = newUsername;
    userData.fullname = newUsername;
    userData.my_referral_code = newRefCode;

    document.getElementById('profile-name-display').textContent = newUsername;
    document.getElementById('profile-username-display').textContent = `@${newUsername}`;
    document.getElementById('dash-username').textContent = `@${newUsername}`;
    document.getElementById('profile-ref-code').textContent = newRefCode;
    document.getElementById('home-ref-code').textContent = newRefCode;
    document.getElementById('ref-code-display').textContent = newRefCode;

    const refLink = `https://abdulhakeemkhalid19-spec.github.io/ver/register.html?ref=${newRefCode}`;
    document.getElementById('ref-link-box').textContent = refLink;

    toggleEditUsername();
    alert(`✅ Username updated to @${newUsername}!\nYour new referral code: ${newRefCode}`);

  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

// ===== EDIT WALLET =====
window.toggleEditWallet = function () {
  const form = document.getElementById('edit-wallet-form');
  form.style.display = form.style.display === 'none' ? 'flex' : 'none';
}

window.saveWallet = async function () {
  const newWallet = document.getElementById('edit-wallet-input').value.trim();

  if (!newWallet.startsWith('0x') || newWallet.length !== 42) {
    alert('⚠️ Please enter a valid BEP-20 wallet address (starts with 0x, 42 characters).');
    return;
  }

  // Check if wallet already used
  const q = query(
    collection(db, 'airdrop_participants'),
    where('wallet', '==', newWallet)
  );
  const snap = await getDocs(q);
  if (!snap.empty && snap.docs[0].ref.id !== userDocRef.id) {
    alert('⚠️ This wallet is already registered to another account!');
    return;
  }

  try {
    await updateDoc(userDocRef, { wallet: newWallet });
    userData.wallet = newWallet;

    document.getElementById('profile-wallet-display').textContent = newWallet;
    document.getElementById('home-wallet').textContent = newWallet;

    toggleEditWallet();
    alert('✅ Wallet address updated successfully!');
  } catch (err) {
    alert('❌ Error: ' + err.message);
  }
}

// ===== CHANGE PICTURE =====
window.changePicture = function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;

      await updateDoc(userDocRef, { photoURL: dataUrl });
      userData.photoURL = dataUrl;

      document.getElementById('profile-pic').src = dataUrl;
      document.getElementById('profile-pic').style.display = 'block';
      document.getElementById('profile-initial-big').style.display = 'none';

      document.getElementById('nav-profile-img').src = dataUrl;
      document.getElementById('nav-profile-img').style.display = 'block';
      document.getElementById('nav-profile-initial').style.display = 'none';

      alert('✅ Profile picture updated!');
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

// ===== MINING =====
window.doMining = async function () {
  if (!userData || !userDocRef) return;
  const now = new Date();

  if (userData.last_mined) {
    const diffHours = (now - new Date(userData.last
