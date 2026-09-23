const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Default Private Master Key (Loaded from private_master_key.pem or fallback)
const keyPath = path.join(__dirname, '../keys/private_master_key.pem');
let privKeyPem = '';

if (fs.existsSync(keyPath)) {
  privKeyPem = fs.readFileSync(keyPath, 'utf8').trim();
} else {
  console.error('❌ Error: private_master_key.pem not found in server/keys/');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--machine' || args[i] === '-m') {
      options.machine = args[++i];
    } else if (args[i] === '--months' || args[i] === '-M') {
      options.months = parseInt(args[++i], 10);
    } else if (args[i] === '--days' || args[i] === '-d') {
      options.days = parseInt(args[++i], 10);
    } else if (args[i] === '--plan' || args[i] === '-p') {
      options.plan = args[++i];
    } else if (args[i] === '--shop' || args[i] === '-s') {
      options.shop = args[++i];
    }
  }
  return options;
}

function generateLicense({ machineId, days, planName, shopName }) {
  const privKey = crypto.createPrivateKey(privKeyPem);
  const now = new Date();
  
  const payload = {
    m: machineId,
    d: days,
    p: planName,
    s: shopName || 'SmartBarber Client',
    i: Math.floor(now.getTime() / 1000)
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.sign(null, Buffer.from(payloadBase64), privKey);
  const sigBase64 = signature.toString('base64url');

  const licenseKey = `SBKEY-${payloadBase64}.${sigBase64}`;
  return { licenseKey, payload };
}

function run() {
  const opts = parseArgs();

  if (!opts.machine) {
    console.log(`
💈 SmartBarber Master License Generator
========================================
Usage:
  node scripts/generateLicense.js --machine <MACHINE_ID> [--months <1|2|3|6|12>] [--days <NUM>] [--shop <NAME>]

Examples:
  node scripts/generateLicense.js --machine SB-WS-F1B9-E50D --months 1
  node scripts/generateLicense.js --machine SB-WS-F1B9-E50D --months 3 --shop "Bole Barber"
  node scripts/generateLicense.js --machine SB-WS-F1B9-E50D --months 12 --shop "Executive Barbershop"
    `);
    process.exit(1);
  }

  let days = opts.days;
  let planName = opts.plan;

  if (opts.months) {
    days = opts.months * 30;
    if (opts.months === 12) days = 365;
    planName = planName || `${opts.months} Month${opts.months > 1 ? 's' : ''} Subscription`;
  } else if (!days) {
    days = 30; // default 1 month
    planName = planName || '1 Month Subscription';
  } else {
    planName = planName || `${days} Days Custom Subscription`;
  }

  const result = generateLicense({
    machineId: opts.machine.trim(),
    days: days,
    planName: planName,
    shopName: opts.shop || ''
  });

  console.log(`
============================================================
           💈 SMARTBARBER OFFICIAL LICENSE KEY 💈
============================================================
Workstation ID : ${opts.machine}
Plan           : ${planName}
Duration       : ${days} Days (~${Math.round(days / 30)} Month/s)
Generated At   : ${new Date().toLocaleString()}
------------------------------------------------------------
🔑 ACTIVATION KEY:
${result.licenseKey}
------------------------------------------------------------

📲 TELEGRAM / SMS READY TEXT TO SEND TO CLIENT:
------------------------------------------------------------
ሰላም! የ SmartBarber ማደሻ የፈቃድ ቁልፍዎ (License Key):
📋 Workstation: ${opts.machine}
📅 ቆይታ (Plan): ${planName} (${days} ቀናት)

የፈቃድ ቁልፍ (Copy this key):
${result.licenseKey}

በሲስተሙ "Renew / Activate License" በሚለው ሳጥን ውስጥ ፔስት (Paste) አድርገው "Activate" ይበሉ።
እናመሰግናለን!
============================================================
`);
}

run();
