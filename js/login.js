// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, TwitterAuthProvider, signInWithPopup, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
const googleProvider = new GoogleAuthProvider();
const twitterProvider = new TwitterAuthProvider();

const actionCodeSettings = {
  url: 'https://abdulhakeemkhalid19-spec.github.io/ver/dashboard.html',
  handleCodeInApp: true,
};

// ===== ON PAGE LOAD =====
window.addEventListener('DOMContentLoaded', async () => {

  // Handle magic link click
  if (isSignInWithEmailLink(auth, window.location.href)) {
    let email = window.localStorage.getItem('verEmailForSignIn');
    if (!email) {
      email = window.prompt('Please enter your email to confirm login:');
    }
    try {
      await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('verEmailForSignIn');
      window.location.href = 'dashboard.html';
    } catch (err) {
      showError('❌ Magic link error: ' + err.message);
    }
    return;
  }

  // If already logged in redirect to dashboard
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const q = query(
        collection(db, 'airdrop_participants'),
        where('email', '==', user.email)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        window.location.href = 'dashboard.html';
      }
    }
  });
});

// ===== LOGIN WITH GOOGLE =====
window.loginWithGoogle = async function () {
  clearMessages();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if registered
    const q = query(
      collection(db, 'airdrop_participants'),
      where('email', '==', user.email)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      showError('⚠️ No account found with this Google account. Please register first.');
      return;
    }

    window.location.href = 'dashboard.html';

  } catch (err) {
    showError('❌ Google login failed: ' + err.message);
  }
}

// ===== LOGIN WITH TWITTER =====
window.loginWithTwitter = async function () {
  clearMessages();
  try {
    const result = await signInWithPopup(auth, twitterProvider);
    const user = result.user;

    // Check if registered
    const q = query(
      collection(db, 'airdrop_participants'),
      where('email', '==', user.email)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      showError('⚠️ No account found with this Twitter account. Please register first.');
      return;
    }

    window.location.href = 'dashboard.html';

  } catch (err) {
    showError('❌ Twitter login failed: ' + err.message);
  }
}

// ===== SEND MAGIC LINK =====
window.sendMagicLink = async function () {
  clearMessages();
  const email = document.getElementById('magic-email').value.trim();
  const btnText = document.getElementById('magic-btn-text');

  if (!email || !email.includes('@')) {
    showError('⚠️ Please enter a valid email address.');
    return;
  }

  try {
    // Check if registered
    const q = query(
      collection(db, 'airdrop_participants'),
      where('email', '==', email)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      showError('⚠️ No account found with this email. Please register first.');
      return;
    }

    btnText.textContent = 'Sending...';

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('verEmailForSignIn', email);

    showSuccess(`✅ Magic link sent to <strong>${email}</strong>! Check your inbox and click the link to login.`);
    btnText.textContent = 'Send Magic Link';

  } catch (err) {
    showError('❌ Error: ' + err.message);
    btnText.textContent = 'Send Magic Link';
  }
}

// ===== HELPERS =====
function showError(msg) {
  const box = document.getElementById('login-error');
  box.innerHTML = msg;
  box.style.display = 'block';
}

function showSuccess(msg) {
  const box = document.getElementById('login-success');
  box.innerHTML = msg;
  box.style.display = 'block';
}

function clearMessages() {
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-success').style.display = 'none';
  }
