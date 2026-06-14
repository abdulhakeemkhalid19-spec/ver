// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// ===== GENERATE REFERRAL CODE =====
function generateReferralCode(name) {
  const clean = name.replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VER-${clean}-${rand}`;
}

// ===== AUTO FILL REFERRAL CODE FROM URL =====
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    document.getElementById('referral_code').value = ref;
  }
});

// ===== REGISTER USER =====
window.registerUser = async function () {
  const fullname = document.getElementById('fullname').value.trim();
  const email = document.getElementById('email').value.trim();
  const telegram = document.getElementById('telegram').value.trim();
  const twitter = document.getElementById('twitter').value.trim();
  const wallet = document.getElementById('wallet').value.trim();
  const referral_code_used = document.getElementById('referral_code').value.trim();

  const errorBox = document.getElementById('form-error');
  const successBox = document.getElementById('form-success');
  const btn = document.querySelector('.btn-primary.full-width');
  const btnText = document.getElementById('btn-text');

  errorBox.style.display = 'none';
  successBox.style.display = 'none';

  // ===== VALIDATION =====
  if (!fullname || !email || !telegram || !twitter || !wallet) {
    errorBox.textContent = '⚠️ Please fill in all required fields.';
    errorBox.style.display = 'block';
    return;
  }

  if (!email.includes('@')) {
    errorBox.textContent = '⚠️ Please enter a valid email address.';
    errorBox.style.display = 'block';
    return;
  }

  if (!wallet.startsWith('0x') || wallet.length !== 42) {
    errorBox.textContent = '⚠️ Please enter a valid BEP-20 wallet address (starts with 0x, 42 characters).';
    errorBox.style.display = 'block';
    return;
  }

  btnText.textContent = 'Registering...';
  btn.disabled = true;

  try {
    const participantsRef = collection(db, 'airdrop_participants');

    // ===== CHECK DUPLICATE EMAIL =====
    const emailQuery = query(participantsRef, where('email', '==', email));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      errorBox.textContent = '⚠️ This email is already registered.';
      errorBox.style.display = 'block';
      btnText.textContent = 'Register & Claim $VER';
      btn.disabled = false;
      return;
    }

    // ===== CHECK DUPLICATE WALLET =====
    const walletQuery = query(participantsRef, where('wallet', '==', wallet));
    const walletSnap = await getDocs(walletQuery);
    if (!walletSnap.empty) {
      errorBox.textContent = '⚠️ This wallet address is already registered.';
      errorBox.style.display = 'block';
      btnText.textContent = 'Register & Claim $VER';
      btn.disabled = false;
      return;
    }

    // ===== GENERATE REFERRAL CODE =====
    const my_referral_code = generateReferralCode(fullname);

    // ===== SAVE TO FIRESTORE =====
    await addDoc(participantsRef, {
      fullname,
      email,
      telegram,
      twitter,
      wallet,
      referral_code_used: referral_code_used || null,
      my_referral_code,
      referral_count: 0,
      ver_points: 0,
      tier: 'Bronze',
      registered_at: new Date().toISOString()
    });

    // ===== CREDIT REFERRER =====
    if (referral_code_used) {
      await creditReferrer(referral_code_used);
    }

    // ===== SHOW SUCCESS =====
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${my_referral_code}`;
    successBox.innerHTML = `
      ✅ You're registered! Share your referral link to earn more $VER:
      <div class="referral-box">
        🔗 ${referralLink}
        <br/>
        <button onclick="copyLink('${referralLink}')" style="
          margin-top:10px;
          background: var(--primary);
          color: #050d1a;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.85rem;
        ">Copy Link</button>
      </div>
    `;
    successBox.style.display = 'block';
    document.getElementById('airdrop-form').style.display = 'none';

  } catch (err) {
    errorBox.textContent = `❌ Error: ${err.message}`;
    errorBox.style.display = 'block';
    btnText.textContent = 'Register & Claim $VER';
    btn.disabled = false;
  }
}

// ===== CREDIT REFERRER =====
async function creditReferrer(referral_code_used) {
  try {
    const participantsRef = collection(db, 'airdrop_participants');
    const q = query(participantsRef, where('my_referral_code', '==', referral_code_used));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const referrerDoc = snap.docs[0];
    const referrer = referrerDoc.data();
    const newCount = (referrer.referral_count || 0) + 1;
    const newPoints = (referrer.ver_points || 0) + 200;

    let newTier = 'Bronze';
    if (newCount >= 20) newTier = 'Diamond';
    else if (newCount >= 10) newTier = 'Gold';
    else if (newCount >= 3) newTier = 'Silver';

    await updateDoc(referrerDoc.ref, {
      ver_points: newPoints,
      referral_count: newCount,
      tier: newTier
    });
  } catch (err) {
    console.error('Referrer credit error:', err);
  }
}

// ===== COPY LINK =====
window.copyLink = function(link) {
  navigator.clipboard.writeText(link).then(() => {
    alert('✅ Referral link copied!');
  });
}
