const crypto = require('crypto');
const os = require('os');

// Embedded Developer Public Key (Ed25519) - Safe to be public in all installations
const MASTER_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA5aasmnNSBNpkeX6RXPt217sgrO89fMO/GC6srWNnYvc=
-----END PUBLIC KEY-----`;

// Active One-Time Developer Challenges (in-memory, expire in 10 minutes, single use)
const activeChallenges = new Map();

function getSetting(db, key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(db, key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

/**
 * Deterministically generates or loads the unique workstation machine ID
 */
function getOrCreateMachineId(db) {
  let machineId = getSetting(db, 'machine_id');
  if (machineId) {
    return machineId;
  }

  // Derive unique hardware fingerprint
  try {
    const hostname = os.hostname() || 'WORKSTATION';
    const platform = os.platform();
    const arch = os.arch();
    const networkInterfaces = os.networkInterfaces();
    let mac = '';
    for (const ifaceName of Object.keys(networkInterfaces)) {
      const iface = networkInterfaces[ifaceName];
      for (const alias of iface) {
        if (!alias.internal && alias.mac && alias.mac !== '00:00:00:00:00:00') {
          mac = alias.mac;
          break;
        }
      }
      if (mac) break;
    }

    const rawId = `${hostname}|${platform}|${arch}|${mac || crypto.randomUUID()}`;
    const hash = crypto.createHash('sha256').update(rawId).digest('hex').toUpperCase();
    machineId = `SB-WS-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
  } catch (err) {
    machineId = `SB-WS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  setSetting(db, 'machine_id', machineId);
  return machineId;
}

/**
 * Initializes default subscription if brand new (grants a 7-day initial setup grace period)
 */
function initSubscriptionSettings(db) {
  const machineId = getOrCreateMachineId(db);
  
  let expiry = getSetting(db, 'subscription_expiry');
  if (!expiry) {
    const trialDays = 7;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + trialDays);
    
    setSetting(db, 'subscription_status', 'active');
    setSetting(db, 'subscription_plan', 'Initial 7-Day Setup Trial');
    setSetting(db, 'subscription_expiry', expiryDate.toISOString());
    setSetting(db, 'subscription_activated_at', new Date().toISOString());
    setSetting(db, 'subscription_last_check', new Date().toISOString());
    setSetting(db, 'subscription_license_key', 'TRIAL-SETUP-KEY');
  }
  return machineId;
}

/**
 * Checks subscription status with clock tampering detection
 */
function getSubscriptionStatus(db) {
  const machineId = getOrCreateMachineId(db);
  const plan = getSetting(db, 'subscription_plan') || 'Free Trial';
  const expiryStr = getSetting(db, 'subscription_expiry');
  const lastCheckStr = getSetting(db, 'subscription_last_check');
  const now = new Date();

  // Clock rollback detection: check if system time was rolled backwards > 2 hours
  if (lastCheckStr) {
    const lastCheck = new Date(lastCheckStr);
    if (now.getTime() < lastCheck.getTime() - (2 * 60 * 60 * 1000)) {
      return {
        machineId,
        status: 'tampered',
        isExpired: true,
        isExpiringSoon: false,
        daysRemaining: 0,
        plan,
        expiryDate: expiryStr,
        error: 'CLOCK_TAMPERED',
        message: 'System clock has been set backwards. Please restore the correct computer date & time to use SmartBarber.'
      };
    }
  }

  // Monotonically advance last_check if current time is ahead
  if (!lastCheckStr || now.getTime() > new Date(lastCheckStr).getTime()) {
    setSetting(db, 'subscription_last_check', now.toISOString());
  }

  if (!expiryStr) {
    return {
      machineId,
      status: 'expired',
      isExpired: true,
      isExpiringSoon: false,
      daysRemaining: 0,
      plan: 'None',
      expiryDate: null
    };
  }

  const expiry = new Date(expiryStr);
  const diffMs = expiry.getTime() - now.getTime();
  const isExpired = diffMs <= 0;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  const isExpiringSoon = !isExpired && (daysRemaining <= 7 || hoursRemaining < 24);

  let timeRemainingText = `${daysRemaining} days`;
  if (isExpired) {
    timeRemainingText = '0 min';
  } else if (diffMs < 60 * 60 * 1000) {
    timeRemainingText = `${Math.max(1, Math.round(diffMs / (60 * 1000)))} mins`;
  } else if (diffMs < 24 * 60 * 60 * 1000) {
    timeRemainingText = `${hoursRemaining}h ${minutesRemaining}m`;
  }

  const formattedExpiry = diffMs < 48 * 60 * 60 * 1000
    ? expiry.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    machineId,
    status: isExpired ? 'expired' : 'active',
    isExpired,
    isExpiringSoon,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    timeRemainingText,
    plan,
    expiryDate: expiry.toISOString(),
    formattedExpiry
  };
}

/**
 * Verifies and activates an Ed25519-signed license key
 */
function verifyAndApplyLicenseKey(db, rawKey) {
  if (!rawKey || typeof rawKey !== 'string') {
    throw new Error('Please enter a valid license key.');
  }

  const cleanKey = rawKey.trim();
  
  // Format expected: SBKEY-<payloadBase64>.<signatureBase64>
  let tokenData = '';
  if (cleanKey.startsWith('SBKEY-')) {
    tokenData = cleanKey.substring(6);
  } else if (cleanKey.includes('.')) {
    tokenData = cleanKey;
  } else {
    throw new Error('Invalid license key format. Key must start with SBKEY-.');
  }

  const [payloadBase64, sigBase64] = tokenData.split('.');
  if (!payloadBase64 || !sigBase64) {
    throw new Error('Invalid or corrupted license key structure.');
  }

  // 1. Verify Ed25519 digital signature against MASTER_PUBLIC_KEY
  try {
    const pubKey = crypto.createPublicKey(MASTER_PUBLIC_KEY);
    const signature = Buffer.from(sigBase64, 'base64url');
    const isVerified = crypto.verify(null, Buffer.from(payloadBase64), pubKey, signature);
    
    if (!isVerified) {
      throw new Error('Cryptographic signature verification failed. Forged or corrupted license key.');
    }
  } catch (err) {
    throw new Error('Invalid or forged license key: ' + err.message);
  }

  // 2. Decode payload
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
  } catch (err) {
    throw new Error('Failed to parse license payload.');
  }

  const currentMachineId = getOrCreateMachineId(db);

  // 3. Machine ID match (allows wildcard '*' for master demo licenses)
  if (payload.m !== '*' && payload.m !== currentMachineId) {
    throw new Error(`This license key was generated for workstation [${payload.m}], but this machine is [${currentMachineId}].`);
  }

  // 4. Calculate new expiry date
  const now = new Date();
  const currentExpiryStr = getSetting(db, 'subscription_expiry');
  let baseDate = now;

  // If current license is still active, extend on top of remaining days
  if (currentExpiryStr) {
    const currExp = new Date(currentExpiryStr);
    if (currExp.getTime() > now.getTime()) {
      baseDate = currExp;
    }
  }

  let msToAdd = 0;
  let addedText = '';
  if (payload.h) {
    msToAdd = payload.h * 60 * 60 * 1000;
    addedText = `${payload.h} Hours`;
  } else if (payload.mins) {
    msToAdd = payload.mins * 60 * 1000;
    addedText = `${payload.mins} Minutes`;
  } else {
    const daysToAdd = parseInt(payload.d || 30, 10);
    msToAdd = daysToAdd * 24 * 60 * 60 * 1000;
    addedText = `${daysToAdd} Days`;
  }

  const newExpiry = new Date(baseDate.getTime() + msToAdd);
  const planName = payload.p || `${addedText} Subscription`;

  // 5. Update settings in database
  setSetting(db, 'subscription_status', 'active');
  setSetting(db, 'subscription_plan', planName);
  setSetting(db, 'subscription_expiry', newExpiry.toISOString());
  setSetting(db, 'subscription_activated_at', now.toISOString());
  setSetting(db, 'subscription_last_check', now.toISOString());
  setSetting(db, 'subscription_license_key', cleanKey);

  const diffMs = newExpiry.getTime() - now.getTime();
  const formattedExpiry = diffMs < 48 * 60 * 60 * 1000
    ? newExpiry.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : newExpiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    success: true,
    machineId: currentMachineId,
    plan: planName,
    addedText,
    newExpiryDate: newExpiry.toISOString(),
    formattedExpiry
  };
}

/**
 * Generates an ephemeral cryptographic challenge for on-site developer maintenance
 */
function generateDeveloperChallenge(db) {
  const machineId = getOrCreateMachineId(db);
  const nonce = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars e.g. 59B8C6
  const challenge = `CH-${nonce}`;
  const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

  activeChallenges.set(challenge, {
    machineId,
    expiresAt,
    used: false
  });

  // Prune expired
  for (const [k, v] of activeChallenges.entries()) {
    if (v.expiresAt < Date.now()) activeChallenges.delete(k);
  }

  return {
    challenge,
    machineId,
    validMinutes: 10
  };
}

/**
 * Cryptographically verifies a signed developer One-Time Challenge response
 * ZERO hardcoded passwords - signed exclusively by the developer's Private Key!
 */
function verifyAndExecuteDeveloperChallenge(db, challengeToken) {
  if (!challengeToken || typeof challengeToken !== 'string') {
    throw new Error('Please enter a valid Developer One-Time Pass.');
  }

  const clean = challengeToken.trim();
  let tokenData = clean;
  if (clean.startsWith('OTP-')) {
    tokenData = clean.substring(4);
  }

  const [payloadB64, sigB64] = tokenData.split('.');
  if (!payloadB64 || !sigB64) {
    throw new Error('Invalid One-Time Pass format.');
  }

  // 1. Verify digital signature against MASTER_PUBLIC_KEY
  try {
    const pubKey = crypto.createPublicKey(MASTER_PUBLIC_KEY);
    const isVerified = crypto.verify(null, Buffer.from(payloadB64), pubKey, Buffer.from(sigB64, 'base64url'));
    if (!isVerified) {
      throw new Error('Cryptographic signature failed. Forged or unauthorized developer pass.');
    }
  } catch (err) {
    throw new Error('Cryptographic signature verification failed: ' + err.message);
  }

  // 2. Parse payload
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (err) {
    throw new Error('Corrupted pass payload.');
  }

  // 3. Verify challenge nonce
  const record = activeChallenges.get(payload.ch);
  if (!record) {
    throw new Error(`Challenge [${payload.ch}] does not exist or has expired. Please generate a new challenge.`);
  }

  if (record.used) {
    throw new Error('This One-Time Pass has already been used. Please request a new challenge.');
  }

  if (record.expiresAt < Date.now()) {
    activeChallenges.delete(payload.ch);
    throw new Error('Challenge has expired (10-minute limit exceeded).');
  }

  const currentMachineId = getOrCreateMachineId(db);
  if (payload.m !== '*' && payload.m !== currentMachineId) {
    throw new Error(`This pass was signed for machine [${payload.m}], but this workstation is [${currentMachineId}].`);
  }

  // Invalidate challenge immediately (Single-use security)
  record.used = true;
  activeChallenges.delete(payload.ch);

  // 4. Apply duration
  const now = new Date();
  const currentExpiryStr = getSetting(db, 'subscription_expiry');
  let baseDate = now;

  if (currentExpiryStr) {
    const currExp = new Date(currentExpiryStr);
    if (currExp.getTime() > now.getTime()) {
      baseDate = currExp;
    }
  }

  let ms = 0;
  let addedText = '';
  if (payload.h) {
    ms = payload.h * 60 * 60 * 1000;
    addedText = `${payload.h} Hour(s)`;
  } else if (payload.mins) {
    ms = payload.mins * 60 * 1000;
    addedText = `${payload.mins} Minute(s)`;
  } else if (payload.months) {
    const d = payload.months * 30;
    ms = d * 24 * 60 * 60 * 1000;
    addedText = `${payload.months} Month(s)`;
  } else {
    const d = parseInt(payload.d || 30, 10);
    ms = d * 24 * 60 * 60 * 1000;
    addedText = `${d} Day(s)`;
  }

  const newExpiry = new Date(baseDate.getTime() + ms);
  const plan = payload.p || `Developer Verified Unlock: ${addedText}`;

  setSetting(db, 'subscription_status', 'active');
  setSetting(db, 'subscription_plan', plan);
  setSetting(db, 'subscription_expiry', newExpiry.toISOString());
  setSetting(db, 'subscription_activated_at', now.toISOString());
  setSetting(db, 'subscription_last_check', now.toISOString());
  setSetting(db, 'subscription_license_key', `DEV-OTP-${payload.ch}-${now.getTime()}`);

  const diffMs = newExpiry.getTime() - now.getTime();
  const formattedExpiry = diffMs < 48 * 60 * 60 * 1000
    ? newExpiry.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : newExpiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    success: true,
    plan,
    addedText,
    newExpiryDate: newExpiry.toISOString(),
    formattedExpiry
  };
}

module.exports = {
  MASTER_PUBLIC_KEY,
  getOrCreateMachineId,
  initSubscriptionSettings,
  getSubscriptionStatus,
  verifyAndApplyLicenseKey,
  generateDeveloperChallenge,
  verifyAndExecuteDeveloperChallenge
};
