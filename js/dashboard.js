// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

  // Check if email is registered
  try {
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

// ===== HANDLE MAGIC LINK ON PAGE LOAD =====
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

// ===== AUTH STATE LISTENER =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadUserData(user.email);
    showDashboard();
  } else {
    showLogin();
  }
});

// ===== LOAD USER DATA FROM FIRESTORE =====
async function loadUserData(email) {
  const q = query(collection(db, 'airdrop_participants'), where('email', '==', email));
  const snap = await getDocs(q);
  if (!snap.empty) {
    userDocRef = snap.docs[0].ref;
    userData = snap.docs[0].data();
  }
}

// ===== SHOW DASHBOARD =====
function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('dashboard-screen').style.display = 'block';

  if (!userData) return;

  // Fill in user info
  document.getElementById('user-name').textContent = userData.fullname?.split(' ')[0] || 'User';
  document.getElementById('total-points').textContent = userData.ver_points || 0;
  document.getElementById('nav-points').textContent = userData.ver_points || 0;
  document.getElementById('tasks-done').textContent = (userData.tasks_completed || []).length;
  document.getElementById('user-tier').textContent = userData.tier || 'Bronze';
  document.getElementById('referral-count').textContent = userData.referral_count || 0;

  // Referral link
  const refLink = `https://abdulhakeemkhalid19-spec.github.io/ver/?ref=${userData.my_referral_code}`;
  document.getElementById('referral-link-display').textContent = refLink;

  // Mark completed tasks
  const completed = userData.tasks_completed || [];
  completed.forEach(taskId => markTaskDone(taskId));

  // Progress bar
  updateProgress(userData.referral_count || 0, userData.tier || 'Bronze');
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

  // Already done
  if (completed.includes(taskId)) {
    alert('✅ You already completed this task!');
    return;
  }

  // Open the task URL
  window.open(url, '_blank');

  // Wait 5 seconds then verify and credit
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
    markTaskDone(taskId);
    document.getElementById('total-points').textContent = newPoints;
    document.getElementById('nav-points').textContent = newPoints;
    document.getElementById('tasks-done').textContent = newCompleted.length;
    updateProgress(userData.referral_count || 0, userData.tier || 'Bronze');

    alert(`🎉 +${points} $VER added to your account!`);
  }, 5000);
}

// ===== MARK TASK AS DONE IN UI =====
function markTaskDone(taskId) {
  const card = document.getElementById(`task-${taskId.replace(/_/g, '-')}`);
  if (!card) return;
  card.classList.add('completed');
  const btn = card.querySelector('.task-btn');
  if (btn) {
    btn.textContent = 'Done';
    btn.classList.add('done');
    btn.disabled = true;
  }
}

// ===== UPDATE PROGRESS BAR =====
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

// ===== COPY REFERRAL LINK =====
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
