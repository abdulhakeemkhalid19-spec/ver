// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, TwitterAuthProvider, signInWithPopup, sendSignInLinkToEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

// ===== GENERATE 6-CHAR REFERRAL CODE =====
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ===== ENSURE UNIQUE REFERRAL CODE =====
async function getUniqueReferralCode() {
  let code, exists;
  do {
    code = generateReferralCode();
    const q = query(
      collection(db, 'airdrop_participants'),
      where('my_referral_code', '==', code)
    );
    const snap = await getDocs(q);
    exists = !snap.empty;
  } while (exists);
  return code;
}

// ===== STATE =====
let pendingEmail = '';
let pendingUsername = '';
let pendingProvider = '';

// ===== AUTO FILL REFERRAL FROM URL =====
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    const refInput = document.getElementById('reg-referral');
    if (refInput) refInput.value = ref;
  }

  // Check if already logged in
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

// ===== SIGN UP WITH GOOGLE =====
window.signUpWithGoogle = async function () {
  const errorBox = document.getElementById('reg-error');
  errorBox.style.display = 'none';

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if already registered
    const q = query(
      collection(db, 'airdrop_participants'),
      where('email', '==', user.email)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      window.location.href = 'dashboard.html';
      return;
    }

    // Pre-fill details and go to step 2
    pendingEmail = user.email;
    pendingUsername = user.displayName || '';
    pendingProvider = 'google';

    document.getElementById('reg-email').value = pendingEmail;
    document.getElementById('reg-username').value = pendingUsername;
    goToStep2();

  } catch (err) {
    errorBox.textContent = `❌ Google sign-in failed: ${err.message}`;
    errorBox.style.display = 'block';
  }
}

// ===== SIGN UP WITH TWITTER =====
window.signUpWithTwitter = async function () {
  const errorBox = document.getElementById('reg-error');
  errorBox.style.display = 'none';

  try {
    const result = await signInWithPopup(auth, twitterProvider);
    const user = result.user;
    const twitterUsername = result._tokenResponse?.screenName || '';

    // Check if already registered
    const q = query(
      collection(db, 'airdrop_participants'),
      where('email', '==', user.email)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      window.location.href = 'dashboard.html';
      return;
    }

    // Pre-fill details
    pendingEmail = user.email || '';
    pendingUsername = twitterUsername || user.displayName || '';
    pendingProvider = 'twitter';

    document.getElementById('reg-email').value = pendingEmail;
    document.getElementById('reg-username').value = pendingUsername;

    // Auto fill twitter username
    if (twitterUsername) {
      document.getElementById('reg-twitter').value = '@' + twitterUsername;
    }

    goToStep2();

  } catch (err) {
    errorBox.textContent = `❌ Twitter sign-in failed: ${err.message}`;
    errorBox.style.display = 'block';
  }
}

// ===== PROCEED TO STEP 2 (MANUAL EMAIL) =====
window.proceedToStep2 = function () {
  const email = document.getElementById('reg-email').value.trim();
  const errorBox = document.getElementById('reg-error');

  errorBox.style.display = 'none';

  if (!email || !email.includes('@')) {
    errorBox.textContent = '⚠️ Please enter a valid Gmail address.';
    errorBox.style.display = 'block';
    return;
  }

  pendingEmail = email;
  pendingProvider = 'email';
  goToStep2();
}

// ===== GO TO STEP 2 =====
function goToStep2() {
  document.getElementById('step-1').style.display = 'none';
  document.getElementById('step-2').style.display = 'block';
}

// ===== GO BACK TO STEP 1 =====
window.goBackStep1 = function () {
  document.getElementById('step-1').style.display = 'block';
  document.getElementById('step-2').style.display = 'none';
  document.getElementById('reg-error').style.display = 'none';
}

// ===== COMPLETE REGISTRATION =====
window.completeRegistration = async function () {
  const username = document.getElementById('reg-username').value.trim();
  const telegram = document.getElementById('reg-telegram').value.trim();
  const twitter = document.getElementById('reg-twitter').value.trim();
  const wallet = document.getElementById('reg-wallet').value.trim();
  const referralUsed = document.getElementById('reg-referral').value.trim().toUpperCase();

  const errorBox = document.getElementById('reg-error');
  const successBox = document.getElementById('reg-success');
  const btnText = document.getElementById('reg-btn-text');

  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  // ===== VALIDATION =====
  if (!username) {
    errorBox.textContent = '⚠️ Please enter a username.';
    errorBox.style.display = 'block';
    return;
  }

  if (!telegram) {
    errorBox.textContent = '⚠️ Please enter your Telegram username.';
    errorBox.style.display = 'block';
    return;
  }

  if (!twitter) {
    errorBox.textContent = '⚠️ Please enter your Twitter/X username.';
    errorBox.style.display = 'block';
    return;
  }

  if (!wallet || !wallet.startsWith('0x') || wallet.length !== 42) {
    errorBox.textContent = '⚠️ Please enter a valid BEP-20 wallet address (starts with 0x, 42 characters).';
    errorBox.style.display = 'block';
    return;
  }

  if (!pendingEmail) {
    errorBox.textContent = '⚠️ Email is missing. Please go back and try again.';
    errorBox.style.display = 'block';
    return;
  }

  btnText.textContent = 'Creating Account...';
  document.querySelector('.btn-primary.full-width').disabled = true;

  try {
    // ===== CHECK DUPLICATE EMAIL =====
    const emailQ = query(
      collection(db, 'airdrop_participants'),
      where('email', '==', pendingEmail)
    );
    const emailSnap = await getDocs(emailQ);
    if (!emailSnap.empty) {
      errorBox.textContent = '⚠️ This email is already registered. Please login instead.';
      errorBox.style.display = 'block';
      btnText.textContent = 'Create Account & Verify Email';
      document.querySelector('.btn-primary.full-width').disabled = false;
      return;
    }

    // ===== CHECK DUPLICATE WALLET =====
    const walletQ = query(
      collection(db, 'airdrop_participants'),
      where('wallet', '==', wallet)
    );
    const walletSnap = await getDocs(walletQ);
    if (!walletSnap.empty) {
      errorBox.textContent = '⚠️ This wallet address is already registered.';
      errorBox.style.display = 'block';
      btnText.textContent = 'Create Account & Verify Email';
      document.querySelector('.btn-primary.full-width').disabled = false;
      return;
    }

    // ===== GENERATE UNIQUE REFERRAL CODE =====
    const myReferralCode = await getUniqueReferralCode();

    // ===== SAVE TO FIRESTORE =====
    await addDoc(collection(db, 'airdrop_participants'), {
      fullname: username,
      username: username,
      email: pendingEmail,
      telegram: telegram.startsWith('@') ? telegram : '@' + telegram,
      twitter: twitter.startsWith('@') ? twitter : '@' + twitter,
      wallet,
      provider: pendingProvider,
      my_referral_code: myReferralCode,
      referral_code_used: referralUsed || null,
      referral_count: 0,
      referral_earnings: 0,
      ver_points: 0,
      tier: 'Bronze',
      tasks_completed: [],
      verified: pendingProvider !== 'email',
      registered_at: new Date().toISOString()
    });

    // ===== CREDIT REFERRER =====
    if (referralUsed) {
      await creditReferrer(referralUsed);
    }

    // ===== SEND VERIFICATION EMAIL (email signups only) =====
    if (pendingProvider === 'email') {
      const actionCodeSettings = {
        url: 'https://abdulhakeemkhalid19-spec.github.io/ver/dashboard.html',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, pendingEmail, actionCodeSettings);
      window.localStorage.setItem('verEmailForSignIn', pendingEmail);

      successBox.innerHTML = `
        ✅ Account created! A verification link has been sent to
        <strong>${pendingEmail}</strong>.
        Click the link in your email to access your dashboard.
      `;
    } else {
      successBox.innerHTML = `
        ✅ Account created successfully!
        <br/><br/>
        Your referral code: <strong style="color:var(--primary);letter-spacing:4px;">${myReferralCode}</strong>
        <br/><br/>
        <a href="dashboard.html" style="color:var(--primary);font-weight:700;">Go to Dashboard →</a>
      `;
    }

    successBox.style.display = 'block';
    document.getElementById('step-2').style.display = 'none';

  } catch (err) {
    errorBox.textContent = `❌ Error: ${err.message}`;
    errorBox.style.display = 'block';
    btnText.textContent = 'Create Account & Verify Email';
    document.querySelector('.btn-primary.full-width').disabled = false;
  }
}

// ===== CREDIT REFERRER =====
async function creditReferrer(code) {
  try {
    const q = query(
      collection(db, 'airdrop_participants'),
      where('my_referral_code', '==', code)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;

    const ref = snap.docs[0];
    const data = ref.data();
    const newCount = (data.referral_count || 0) + 1;

    let bonus = 200;
    let newTier = 'Bronze';
    if (newCount >= 20) { bonus = 500; newTier = 'Diamond'; }
    else if (newCount >= 10) { bonus = 400; newTier = 'Gold'; }
    else if (newCount >= 3) { bonus = 300; newTier = 'Silver'; }

    const { updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await updateDoc(ref.ref, {
      referral_count: newCount,
      referral_earnings: (data.referral_earnings || 0) + bonus,
      ver_points: (data.ver_points || 0) + bonus,
      tier: newTier
    });
  } catch (err) {
    console.error('Referrer credit error:', err);
  }
        }
