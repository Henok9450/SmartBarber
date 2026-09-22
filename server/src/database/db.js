const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'smartbarber.db');
const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

function initDatabase() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS barbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amharic_name TEXT,
      phone TEXT,
      chair_number INTEGER,
      commission_rate REAL DEFAULT 0.50,
      avatar_url TEXT,
      status TEXT DEFAULT 'active', -- active, busy, break, off
      pin_code TEXT DEFAULT '1234',
      rating REAL DEFAULT 4.9,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amharic_name TEXT NOT NULL,
      category TEXT DEFAULT 'haircut', -- haircut, beard, facial, combo, product
      price REAL NOT NULL,
      duration_minutes INTEGER DEFAULT 25,
      commission_rate REAL DEFAULT 0.50,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      barber_id INTEGER,
      service_id INTEGER,
      status TEXT DEFAULT 'waiting', -- waiting, in_chair, completed, cancelled
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY (barber_id) REFERENCES barbers(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT UNIQUE NOT NULL,
      customer_name TEXT DEFAULT 'Walk-in Customer',
      customer_phone TEXT,
      barber_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      barber_commission REAL NOT NULL,
      shop_share REAL NOT NULL,
      tip_amount REAL DEFAULT 0,
      payment_method TEXT NOT NULL, -- telebirr, cash, cbe_birr, card
      telebirr_tx_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      settlement_date TEXT DEFAULT (DATE('now', 'localtime')),
      FOREIGN KEY (barber_id) REFERENCES barbers(id)
    );

    CREATE TABLE IF NOT EXISTS ticket_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      service_id INTEGER,
      service_name TEXT NOT NULL,
      price REAL NOT NULL,
      barber_commission REAL NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      barber_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      deposit_paid REAL DEFAULT 0,
      telebirr_tx_id TEXT,
      status TEXT DEFAULT 'confirmed', -- confirmed, cancelled, completed
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (barber_id) REFERENCES barbers(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS daily_settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      settlement_date TEXT UNIQUE NOT NULL,
      total_revenue REAL DEFAULT 0,
      total_cash REAL DEFAULT 0,
      total_telebirr REAL DEFAULT 0,
      total_cbe REAL DEFAULT 0,
      total_commission REAL DEFAULT 0,
      total_shop_profit REAL DEFAULT 0,
      total_cuts INTEGER DEFAULT 0,
      status TEXT DEFAULT 'open', -- open, closed
      closed_at DATETIME,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      amharic_name TEXT,
      role TEXT NOT NULL, -- 'owner', 'cashier', 'barber'
      pin_code TEXT NOT NULL,
      barber_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (barber_id) REFERENCES barbers(id)
    );
  `);

  // Default settings if empty
  const checkSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get();
  if (checkSettings.count === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    const defaultSettings = [
      ['shop_name', 'SmartBarber Shop'],
      ['shop_name_amharic', 'ስማርት ባርበር ሾፕ'],
      ['branch_name', 'Bole Executive Branch'],
      ['branch_name_amharic', 'ቦሌ ኤክስኪዩቲቭ ቅርንጫፍ'],
      ['currency', 'ETB'],
      ['telebirr_merchant_code', ''],
      ['telebirr_phone', ''],
      ['cbe_account', ''],
      ['address', 'Cameroon St, Next to Edna Mall, Bole, Addis Ababa'],
      ['address_amharic', 'ካሜሩን ጎዳና፣ ኤድና ሞል አጠገብ፣ ቦሌ፣ አዲስ አበባ'],
      ['phone', '+251 911 244 556'],
      ['logo_url', ''],
      ['logo_icon', 'scissors'],
      ['daily_report_telegram_id', ''],
      ['default_cut_price', '200']
    ];
    for (const [key, val] of defaultSettings) {
      insertSetting.run(key, val);
    }
  }

  // Base System Users (Only Owner and Cashier for initial administrative setup)
  const checkUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (checkUsers.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (username, name, amharic_name, role, pin_code, barber_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Owner (Default PIN: 1234)
    insertUser.run('owner', 'Shop Owner', 'የሱቅ ባለቤት', 'owner', '1234', null);

    // Cashier Desk (Default PIN: 2222)
    insertUser.run('cashier', 'Reception Cashier', 'የካሸር ዴስክ', 'cashier', '2222', null);
  }
}

initDatabase();

module.exports = db;
