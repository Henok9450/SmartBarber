const db = require('../database/db');

// List all barbers with today's metrics
function getAllBarbers(req, res) {
  try {
    const barbers = db.prepare(`
      SELECT b.*,
        COUNT(t.id) as cuts_today,
        COALESCE(SUM(t.barber_commission), 0) as commission_today,
        COALESCE(SUM(t.tip_amount), 0) as tips_today,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.total_amount ELSE 0 END), 0) as cash_collected_today,
        COALESCE(SUM(CASE WHEN t.payment_method = 'telebirr' THEN t.total_amount ELSE 0 END), 0) as telebirr_collected_today
      FROM barbers b
      LEFT JOIN tickets t ON t.barber_id = b.id AND t.settlement_date = DATE('now', 'localtime')
      WHERE b.is_active = 1
      GROUP BY b.id
      ORDER BY b.chair_number ASC
    `).all();

    res.json({ success: true, data: barbers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Get all barbers (including inactive ones for Admin management)
function getAdminBarbers(req, res) {
  try {
    const barbers = db.prepare(`
      SELECT b.*,
        COUNT(t.id) as cuts_today,
        COALESCE(SUM(t.barber_commission), 0) as commission_today
      FROM barbers b
      LEFT JOIN tickets t ON t.barber_id = b.id AND t.settlement_date = DATE('now', 'localtime')
      GROUP BY b.id
      ORDER BY b.chair_number ASC
    `).all();

    res.json({ success: true, data: barbers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Get detailed stats for one barber (Barber Personal App / Screen)
function getBarberDetail(req, res) {
  try {
    const { id } = req.params;
    const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);

    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barber not found' });
    }

    const { period = 'today' } = req.query;
    let dateCondition = "t.settlement_date = DATE('now', 'localtime')";
    let summaryDateCondition = "settlement_date = DATE('now', 'localtime')";

    if (period === 'yesterday') {
      dateCondition = "t.settlement_date = DATE('now', '-1 day', 'localtime')";
      summaryDateCondition = "settlement_date = DATE('now', '-1 day', 'localtime')";
    } else if (period === 'week') {
      dateCondition = "t.settlement_date >= DATE('now', '-7 days', 'localtime')";
      summaryDateCondition = "settlement_date >= DATE('now', '-7 days', 'localtime')";
    } else if (period === 'month') {
      dateCondition = "t.settlement_date >= DATE('now', 'start of month', 'localtime')";
      summaryDateCondition = "settlement_date >= DATE('now', 'start of month', 'localtime')";
    } else if (period === 'all') {
      dateCondition = "1=1";
      summaryDateCondition = "1=1";
    }

    const todayTickets = db.prepare(`
      SELECT t.*, GROUP_CONCAT(ti.service_name, ', ') as services_rendered
      FROM tickets t
      LEFT JOIN ticket_items ti ON ti.ticket_id = t.id
      WHERE t.barber_id = ? AND ${dateCondition}
      GROUP BY t.id
      ORDER BY t.id DESC
    `).all(id);

    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_cuts,
        COALESCE(SUM(total_amount), 0) as total_volume,
        COALESCE(SUM(barber_commission), 0) as total_commission,
        COALESCE(SUM(tip_amount), 0) as total_tips,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as direct_cash_in_hand,
        COALESCE(SUM(CASE WHEN payment_method = 'telebirr' THEN total_amount ELSE 0 END), 0) as telebirr_volume
      FROM tickets
      WHERE barber_id = ? AND ${summaryDateCondition}
    `).get(id);

    const totalEarnings = summary.total_commission + summary.total_tips;
    const netPayoutFromShop = totalEarnings; // All cash is collected by the cashier/POS

    // Current queue for this barber
    const queue = db.prepare(`
      SELECT q.*, s.name as service_name, s.amharic_name as service_amharic_name, s.duration_minutes
      FROM queue q
      LEFT JOIN services s ON s.id = q.service_id
      WHERE q.barber_id = ? AND q.status IN ('waiting', 'in_chair')
      ORDER BY q.id ASC
    `).all(id);

    res.json({
      success: true,
      data: {
        barber,
        summary: {
          ...summary,
          total_earnings: totalEarnings,
          net_payout_from_shop: netPayoutFromShop
        },
        todayTickets,
        queue
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Update status (active, busy, break, off)
function updateBarberStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE barbers SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Owner Privileged: Create New Barber
function createBarber(req, res) {
  try {
    const {
      name,
      amharic_name,
      phone,
      chair_number,
      commission_rate = 0.50,
      avatar_url = '',
      status = 'active',
      pin_code = '1234'
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Barber name is required' });
    }

    // Determine next chair number if not provided
    let chair = chair_number;
    if (!chair) {
      const maxChairRow = db.prepare('SELECT COALESCE(MAX(chair_number), 0) as max_chair FROM barbers').get();
      chair = maxChairRow.max_chair + 1;
    }

    const stmt = db.prepare(`
      INSERT INTO barbers (name, amharic_name, phone, chair_number, commission_rate, avatar_url, status, pin_code, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      name.trim(),
      amharic_name ? amharic_name.trim() : name.trim(),
      phone || '',
      parseInt(chair),
      parseFloat(commission_rate) || 0.50,
      avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      status || 'active',
      pin_code || '1234'
    );

    const barberId = result.lastInsertRowid;

    // Automatically create corresponding User account for RBAC login
    const username = `barber_${barberId}`;
    db.prepare(`
      INSERT OR REPLACE INTO users (username, name, amharic_name, role, pin_code, barber_id, is_active)
      VALUES (?, ?, ?, 'barber', ?, ?, 1)
    `).run(
      username,
      name.trim(),
      amharic_name ? amharic_name.trim() : name.trim(),
      String(pin_code || '1234').trim(),
      barberId
    );

    const newBarber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(barberId);
    res.json({ success: true, data: newBarber, message: 'Barber created successfully' });
  } catch (err) {
    console.error('Error creating barber:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Owner Privileged: Update Barber details
function updateBarber(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      amharic_name,
      phone,
      chair_number,
      commission_rate,
      avatar_url,
      status,
      pin_code,
      is_active
    } = req.body;

    const existing = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Barber not found' });
    }

    const stmt = db.prepare(`
      UPDATE barbers SET
        name = ?,
        amharic_name = ?,
        phone = ?,
        chair_number = ?,
        commission_rate = ?,
        avatar_url = ?,
        status = ?,
        pin_code = ?,
        is_active = ?
      WHERE id = ?
    `);

    stmt.run(
      name !== undefined ? name.trim() : existing.name,
      amharic_name !== undefined ? amharic_name.trim() : existing.amharic_name,
      phone !== undefined ? phone : existing.phone,
      chair_number !== undefined ? parseInt(chair_number) : existing.chair_number,
      commission_rate !== undefined ? parseFloat(commission_rate) : existing.commission_rate,
      avatar_url !== undefined ? avatar_url : existing.avatar_url,
      status !== undefined ? status : existing.status,
      pin_code !== undefined ? pin_code : existing.pin_code,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      id
    );

    // Keep user table in sync
    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        amharic_name = COALESCE(?, amharic_name),
        pin_code = COALESCE(?, pin_code),
        is_active = COALESCE(?, is_active)
      WHERE barber_id = ?
    `).run(
      name !== undefined ? name.trim() : null,
      amharic_name !== undefined ? amharic_name.trim() : null,
      pin_code !== undefined ? String(pin_code).trim() : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      id
    );

    const updated = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Barber updated successfully' });
  } catch (err) {
    console.error('Error updating barber:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Owner Privileged: Deactivate or Delete Barber
function deleteBarber(req, res) {
  try {
    const { id } = req.params;
    // Check if this barber has any historical tickets
    const ticketCount = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE barber_id = ?').get(id);
    if (ticketCount.count === 0) {
      // Clean hard delete if no historical tickets
      db.prepare('DELETE FROM barbers WHERE id = ?').run(id);
      db.prepare('DELETE FROM users WHERE barber_id = ?').run(id);
      res.json({ success: true, message: 'Barber deleted permanently' });
    } else {
      // Soft delete to protect financial audit trail
      db.prepare('UPDATE barbers SET is_active = 0, status = "off" WHERE id = ?').run(id);
      db.prepare('UPDATE users SET is_active = 0 WHERE barber_id = ?').run(id);
      res.json({ success: true, message: 'Barber deactivated' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getAllBarbers,
  getAdminBarbers,
  getBarberDetail,
  updateBarberStatus,
  createBarber,
  updateBarber,
  deleteBarber
};
