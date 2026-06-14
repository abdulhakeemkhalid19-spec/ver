// ===== SUPABASE CONFIG =====
// Replace these with your actual Supabase project details
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// ===== GENERATE REFERRAL CODE =====
function generateReferralCode(name) {
  const clean = name.replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VER-${clean}-${rand}`;
}

// ===== GET REFERRAL CODE FROM URL =====
function getReferralFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || '';
}

// ===== AUTO FILL REFERRAL CODE IF IN URL =====
window.addEventListener('DOMContentLoaded', () => {
  const refCode = getReferralFromURL();
  if (refCode) {
    document.getElementById('referral_code').value = refCode;
  }
});

// ===== REGISTER USER =====
async function registerUser() {
  const fullname = document.getElementById('fullname').value.trim();
  const email = document.getElementById('email').value.trim();
  const telegram = document.getElementById('telegram').value.trim();
  const twitter = document.getElementById('twitter').value.trim();
  const wallet = document.getElementById('wallet').value.trim();
  const referral_code_used = document.getElementById('referral_code').value.trim();

  const errorBox = document.getElementById('form-error');
  const successBox = document.getElementById('form-success');
  const btnText = document.getElementById('btn-text');

  // Reset messages
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

  // ===== LOADING STATE =====
  btnText.textContent = 'Registering...';
  document.querySelector('.btn-primary.full-width').disabled = true;

  try {
    // ===== CHECK FOR DUPLICATE EMAIL OR WALLET =====
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/airdrop_participants?or=(email.eq.${encodeURIComponent(email)},wallet.eq.${encodeURIComponent(wallet)})`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );

    const existing = await checkRes.json();

    if (existing.length > 0) {
      errorBox.textContent = '⚠️ This email or wallet address is already registered.';
      errorBox.style.display = 'block';
      btnText.textContent = 'Register & Claim $VER';
      document.querySelector('.btn-primary.full-width').disabled = false;
      return;
    }

    // ===== GENERATE UNIQUE REFERRAL CODE =====
    const my_referral_code = generateReferralCode(fullname);

    // ===== CALCULATE INITIAL VER POINTS =====
    // Base reward for registering
    let ver_points = 0;

    // ===== INSERT INTO SUPABASE =====
    const insertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/airdrop_participants`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          fullname,
          email,
          telegram,
          twitter,
          wallet,
          referral_code_used: referral_code_used || null,
          my_referral_code,
          ver_points,
          tier: 'Bronze',
          tasks_completed: [],
          registered_at: new Date().toISOString()
        })
      }
    );

    if (!insertRes.ok) {
      throw new Error('Registration failed. Please try again.');
    }

    // ===== IF REFERRAL CODE USED — CREDIT REFERRER =====
    if (referral_code_used) {
      await creditReferrer(referral_code_used);
    }

    // ===== SHOW SUCCESS + REFERRAL LINK =====
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${my_referral_code}`;

    successBox.innerHTML = `
      ✅ You're registered! Share your referral link to earn more $VER:<br/>
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
    errorBox.textContent = `❌ ${err.message}`;
    errorBox.style.display = 'block';
    btnText.textContent = 'Register & Claim $VER';
    document.querySelector('.btn-primary.full-width').disabled = false;
  }
}

// ===== CREDIT REFERRER IN SUPABASE =====
async function creditReferrer(referral_code_used) {
  try {
    // Find the referrer
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/airdrop_participants?my_referral_code=eq.${encodeURIComponent(referral_code_used)}`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      }
    );

    const referrers = await res.json();
    if (referrers.length === 0) return;

    const referrer = referrers[0];
    const newPoints = (referrer.ver_points || 0) + 200;
    const newReferralCount = (referrer.referral_count || 0) + 1;

    // Determine new tier
    let newTier = 'Bronze';
    if (newReferralCount >= 20) newTier = 'Diamond';
    else if (newReferralCount >= 10) newTier = 'Gold';
    else if (newReferralCount >= 3) newTier = 'Silver';

    // Update referrer's points and tier
    await fetch(
      `${SUPABASE_URL}/rest/v1/airdrop_participants?my_referral_code=eq.${encodeURIComponent(referral_code_used)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ver_points: newPoints,
          referral_count: newReferralCount,
          tier: newTier
        })
      }
    );
  } catch (err) {
    console.error('Could not credit referrer:', err);
  }
}

// ===== COPY REFERRAL LINK =====
function copyLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    alert('✅ Referral link copied to clipboard!');
  });
          }
