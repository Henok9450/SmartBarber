const crypto = require('crypto');
const os = require('os');

// Embedded Developer Public Key (Ed25519) - Safe to be public in all installations
const MASTER_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA5aasmnNSBNpkeX6RXPt217sgrO89fMO/GC6srWNnYvc=
-----END PUBLIC KEY-----`;

// Master Developer Emergency PIN for direct workstation setup
const DEVELOPER_MASTER_PIN = '987654';

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
 * On-site direct developer extension (protected by developer master PIN)
 */
function developerDirectExtend(db, masterPin, daysToAdd, planLabel, hoursToAdd) {
  if (masterPin !== DEVELOPER_MASTER_PIN) {
    throw new Error('Invalid Developer Master PIN.');
  }

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
  if (hoursToAdd) {
    ms = hoursToAdd * 60 * 60 * 1000;
  } else {
    const days = parseInt(daysToAdd || 30, 10);
    ms = days * 24 * 60 * 60 * 1000;
  }

  const newExpiry = new Date(baseDate.getTime() + ms);
  const plan = planLabel || (hoursToAdd ? `Developer Override: ${hoursToAdd} Hours` : `Developer Direct: ${daysToAdd} Days`);

  setSetting(db, 'subscription_status', 'active');
  setSetting(db, 'subscription_plan', plan);
  setSetting(db, 'subscription_expiry', newExpiry.toISOString());
  setSetting(db, 'subscription_activated_at', now.toISOString());
  setSetting(db, 'subscription_last_check', now.toISOString());
  setSetting(db, 'subscription_license_key', `ON-SITE-DEV-PIN-${now.getTime()}`);

  const diffMs = newExpiry.getTime() - now.getTime();
  const formattedExpiry = diffMs < 48 * 60 * 60 * 1000
    ? newExpiry.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : newExpiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    success: true,
    plan,
    daysAdded: daysToAdd || 0,
    hoursAdded: hoursToAdd || 0,
    newExpiryDate: newExpiry.toISOString(),
    formattedExpiry
  };
}

module.exports = {
  MASTER_PUBLIC_KEY,
  DEVELOPER_MASTER_PIN,
  getOrCreateMachineId,
  initSubscriptionSettings,
  getSubscriptionStatus,
  verifyAndApplyLicenseKey,
  developerDirectExtend
};
