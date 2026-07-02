// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
let userData = null;

// ===== ON PAGE LOAD =====
window.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData(user.email);
      updateUIForLoggedIn();
      await checkExistingApplication();
    } else {
      updateUIForGuest();
    }
  });
});

// ===== LOAD USER DATA =====
async function loadUserData(email) {
  try {
    const emails = [email.toLowerCase().trim(), email.trim()];
    for (const e of emails) {
      const q = query(
        collection(db, 'airdrop_participants'),
        where('email', '==', e)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        userData = snap.docs[0].data();
        return;
      }
    }
  } catch (err) {
    console.error('Load user error:', err);
  }
}

// ===== CHECK EXISTING APPLICATION =====
async function checkExistingApplication() {
  if (!currentUser) return;
  try {
    const q = query(
      collection(db, 'ambassador_applications'),
      where('email', '==', currentUser.email.toLowerCase().trim())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const app = snap.docs[0].data();
      showApplicationStatus(app.status, app);
    }
  } catch (err) {
    console.error('Check application error:', err);
  }
}

// ===== SHOW APPLICATION STATUS =====
function showApplicationStatus(status, appData) {
  const formSection = document.getElementById('apply-form-section');
  const statusSection = document.getElementById('application-status');
  if (!formSection || !statusSection) return;

  formSection.style.display = 'none';
  statusSection.style.display = 'block';

  if (status === 'pending') {
    statusSection.innerHTML = `
      <div class="status-card pending">
        <div class="status-icon">⏳</div>
        <h3>Application Under Review</h3>
        <p>Your ambassador application has been submitted and is currently being reviewed by our team. We'll notify you soon!</p>
        <div class="status-badge-large pending">Pending Review</div>
      </div>
    `;
  } else if (status === 'approved') {
    statusSection.innerHTML = `
      <div class="status-card approved">
        <div class="status-icon">🎉</div>
        <h3>Application Approved!</h3>
        <p>Congratulations! You are now an official $VER Ambassador. Access your ambassador dashboard to start submitting promotions.</p>
        <a href="ambassador-dashboard.html" class="btn-primary" style="margin-top:16px;display:inline-block;">Go to Ambassador Dashboard →</a>
      </div>
    `;
  } else if (status === 'rejected') {
    statusSection.innerHTML = `
      <div class="status-card rejected">
        <div class="status-icon">❌</div>
        <h3>Application Not Approved</h3>
        <p>Unfortunately your application was not approved at this time. You can reapply after 30 days or continue earning through tasks and referrals.</p>
        <div class="status-badge-large rejected">Not Approved</div>
      </div>
    `;
  }
}

// ===== UPDATE UI FOR LOGGED IN =====
function updateUIForLoggedIn() {
  const loginPrompt = document.getElementById('login-prompt');
  const applyFormSection = document.getElementById('apply-form-section');
  if (loginPrompt) loginPrompt.style.display = 'none';
  if (applyFormSection) applyFormSection.style.display = 'block';

  if (userData) {
    const nameInput = document.getElementById('app-name');
    const emailInput = document.getElementById('app-email');
    const telegramInput = document.getElementById('app-telegram');
    const twitterInput = document.getElementById('app-twitter');
    if (nameInput) nameInput.value = userData.fullname || userData.username || '';
    if (emailInput) emailInput.value = userData.email || '';
    if (telegramInput) telegramInput.value = userData.telegram || '';
    if (twitterInput) twitterInput.value = userData.twitter || '';
  }
}

// ===== UPDATE UI FOR GUEST =====
function updateUIForGuest() {
  const loginPrompt = document.getElementById('login-prompt');
  const applyFormSection = document.getElementById('apply-form-section');
  if (loginPrompt) loginPrompt.style.display = 'block';
  if (applyFormSection) applyFormSection.style.display = 'none';
}

// ===== SUBMIT APPLICATION =====
window.submitApplication = async function () {
  if (!currentUser) {
    alert('Please login first to apply.');
    window.location.href = 'login.html';
    return;
  }

  const name = document.getElementById('app-name').value.trim();
  const email = document.getElementById('app-email').value.trim();
  const telegram = document.getElementById('app-telegram').value.trim();
  const twitter = document.getElementById('app-twitter').value.trim();
  const followers = document.getElementById('app-followers').value.trim();
  const country = document.getElementById('app-country').value.trim();
  const experience = document.getElementById('app-experience').value.trim();
  const motivation = document.getElementById('app-motivation').value.trim();
  const plan = document.getElementById('app-plan').value.trim();

  const errorBox = document.getElementById('app-error');
  const successBox = document.getElementById('app-success');
  const btn = document.getElementById('app-submit-btn');

  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  if (!name || !email || !telegram || !twitter || !followers || !country || !motivation || !plan) {
    errorBox.textContent = '⚠️ Please fill in all required fields.';
    errorBox.style.display = 'block';
    return;
  }

  btn.textContent = 'Submitting...';
  btn.disabled = true;

  try {
    // Check for existing application
    const q = query(
      collection(db, 'ambassador_applications'),
      where('email', '==', email.toLowerCase().trim())
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      errorBox.textContent = '⚠️ You have already submitted an application.';
      errorBox.style.display = 'block';
      btn.textContent = 'Submit Application';
      btn.disabled = false;
      return;
    }

    await addDoc(collection(db, 'ambassador_applications'), {
      name,
      email: email.toLowerCase().trim(),
      telegram,
      twitter,
      followers,
      country,
      experience: experience || 'None',
      motivation,
      plan,
      status: 'pending',
      ver_points: userData?.ver_points || 0,
      referral_count: userData?.referral_count || 0,
      applied_at: new Date().toISOString()
    });

    successBox.innerHTML = `
      ✅ Application submitted successfully!
      Our team will review your application within 3-5 business days.
      Check back here to see your application status.
    `;
    successBox.style.display = 'block';
    document.getElementById('apply-form-section').style.display = 'none';

    const statusSection = document.getElementById('application-status');
    if (statusSection) {
      statusSection.style.display = 'block';
      showApplicationStatus('pending', {});
    }

  } catch (err) {
    errorBox.textContent = `❌ Error: ${err.message}`;
    errorBox.style.display = 'block';
    btn.textContent = 'Submit Application';
    btn.disabled = false;
  }
      }
