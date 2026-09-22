const db = require('../database/db');

// Login via PIN or Username + PIN
function login(req, res) {
  try {
    const { username, pin, role, barber_id } = req.body;

    if (!pin) {
      return res.status(400).json({ success: false, error: 'PIN or Password is required' });
    }

    let user = null;

    if (username) {
      user = db.prepare('SELECT * FROM users WHERE username = ? AND pin_code = ? AND is_active = 1').get(username.trim(), String(pin).trim());
    } else if (role && barber_id) {
      user = db.prepare('SELECT * FROM users WHERE role = ? AND barber_id = ? AND pin_code = ? AND is_active = 1').get(role, barber_id, String(pin).trim());
    } else if (role) {
      user = db.prepare('SELECT * FROM users WHERE role = ? AND pin_code = ? AND is_active = 1').get(role, String(pin).trim());
    } else {
      // Rapid PIN login: match by PIN alone
      user = db.prepare('SELECT * FROM users WHERE pin_code = ? AND is_active = 1 LIMIT 1').get(String(pin).trim());
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid PIN or credentials' });
    }

    // Generate lightweight bearer token
    const token = `usr_${user.id}_${user.role}`;

    const profile = {
      id: user.id,
      username: user.username,
      name: user.name,
      amharic_name: user.amharic_name,
      role: user.role,
      barber_id: user.barber_id
    };

    res.json({
      success: true,
      token,
      user: profile,
      message: `Welcome ${user.name}`
    });
  } catch (err) {
    console.error('Error in login:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Get current active session
function getMe(req, res) {
  res.json({
    success: true,
    user: req.user
  });
}

// Owner only: List users
function getUsers(req, res) {
  try {
    const users = db.prepare(`
      SELECT u.id, u.username, u.name, u.amharic_name, u.role, u.pin_code, u.barber_id, u.is_active,
        b.name as barber_name, b.chair_number
      FROM users u
      LEFT JOIN barbers b ON b.id = u.barber_id
      ORDER BY u.role, u.id
    `).all();

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Owner only: Update/Reset any User PIN
function updateUserPin(req, res) {
  try {
    const { id } = req.params;
    const { pin_code } = req.body;

    if (!pin_code || String(pin_code).trim().length < 4) {
      return res.status(400).json({ success: false, error: 'PIN must be at least 4 digits' });
    }

    const cleanPin = String(pin_code).trim();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    db.prepare('UPDATE users SET pin_code = ? WHERE id = ?').run(cleanPin, id);

    if (user.barber_id) {
      db.prepare('UPDATE barbers SET pin_code = ? WHERE id = ?').run(cleanPin, user.barber_id);
    }

    res.json({ success: true, message: `PIN for ${user.name} updated to ${cleanPin}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Any authenticated user: Change their own PIN
function changeOwnPin(req, res) {
  try {
    const { old_pin, new_pin } = req.body;
    const userId = req.user.id;

    if (!userId || userId === 0) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!new_pin || String(new_pin).trim().length < 4) {
      return res.status(400).json({ success: false, error: 'New PIN must be at least 4 digits' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.pin_code !== String(old_pin).trim()) {
      return res.status(400).json({ success: false, error: 'Current PIN is incorrect' });
    }

    const cleanPin = String(new_pin).trim();
    db.prepare('UPDATE users SET pin_code = ? WHERE id = ?').run(cleanPin, userId);

    if (user.barber_id) {
      db.prepare('UPDATE barbers SET pin_code = ? WHERE id = ?').run(cleanPin, user.barber_id);
    }

    res.json({ success: true, message: 'Your PIN has been updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  login,
  getMe,
  getUsers,
  updateUserPin,
  changeOwnPin
};
