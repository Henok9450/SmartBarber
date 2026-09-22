const db = require('../database/db');

// Get POS Initial Data (Barbers, Services, Settings, Today's Quick Stats)
function getPOSInit(req, res) {
  try {
    const barbers = db.prepare(`
      SELECT b.*, 
        COUNT(t.id) as cuts_today,
        COALESCE(SUM(t.barber_commission), 0) as commission_today
      FROM barbers b
      LEFT JOIN tickets t ON t.barber_id = b.id AND t.settlement_date = DATE('now', 'localtime')
      WHERE b.is_active = 1
      GROUP BY b.id
      ORDER BY b.chair_number ASC
    `).all();

    const services = db.prepare(`
      SELECT * FROM services WHERE is_active = 1 ORDER BY category, price ASC
    `).all();

    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(row => {
      settings[row.key] = row.value;
    });

    const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        COALESCE(SUM(total_amount), 0) as gross_revenue,
        COALESCE(SUM(barber_commission), 0) as total_commissions,
        COALESCE(SUM(shop_share), 0) as net_shop,
        COALESCE(SUM(CASE WHEN payment_method = 'telebirr' THEN total_amount ELSE 0 END), 0) as telebirr_total,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'cbe_birr' THEN total_amount ELSE 0 END), 0) as cbe_total
      FROM tickets
      WHERE settlement_date = DATE('now', 'localtime')
    `).get();

    res.json({
      success: true,
      data: {
        barbers,
        services,
        settings,
        todayStats
      }
    });
  } catch (err) {
    console.error('Error in getPOSInit:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Create a new sales ticket
function createTicket(req, res) {
  try {
    const {
      barber_id,
      customer_name,
      customer_phone,
      payment_method, // 'telebirr', 'cash', 'cbe_birr', 'card'
      telebirr_tx_id,
      items, // array of { service_id, price, commission_rate }
      tip_amount = 0,
      notes = '',
      queue_id = null
    } = req.body;

    if (!barber_id || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Barber and at least one service item are required' });
    }

    const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(barber_id);
    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barber not found' });
    }

    // Generate clean unique ticket number, e.g. SB-20260922-001
    const dateRow = db.prepare("SELECT strftime('%Y%m%d', 'now', 'localtime') as ymd").get();
    const todayYmd = dateRow?.ymd || new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const countRow = db.prepare("SELECT COUNT(*) as count FROM tickets WHERE settlement_date = DATE('now', 'localtime')").get();
    let seq = (countRow ? countRow.count : 0) + 1;
    let ticket_number = `SB-${todayYmd}-${String(seq).padStart(3, '0')}`;

    // Guarantee uniqueness against any edge cases or existing numbers
    while (db.prepare('SELECT id FROM tickets WHERE ticket_number = ?').get(ticket_number)) {
      seq++;
      ticket_number = `SB-${todayYmd}-${String(seq).padStart(3, '0')}`;
    }

    let total_amount = 0;
    let total_commission = 0;

    const calculatedItems = items.map(item => {
      const price = parseFloat(item.price) || 0;
      // Default to service commission rate or barber's standard rate
      const rate = item.commission_rate !== undefined ? parseFloat(item.commission_rate) : barber.commission_rate;
      const barberComm = price * rate;
      total_amount += price;
      total_commission += barberComm;
      return {
        service_id: item.service_id,
        service_name: item.name || item.service_name || 'Service',
        price: price,
        barber_commission: barberComm
      };
    });

    const shop_share = total_amount - total_commission;

    // Transaction execution
    const insertTx = db.transaction(() => {
      const ticketStmt = db.prepare(`
        INSERT INTO tickets (
          ticket_number, customer_name, customer_phone, barber_id,
          total_amount, barber_commission, shop_share, tip_amount,
          payment_method, telebirr_tx_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = ticketStmt.run(
        ticket_number,
        customer_name || 'Walk-in Customer',
        customer_phone || '',
        barber_id,
        total_amount,
        total_commission,
        shop_share,
        parseFloat(tip_amount) || 0,
        payment_method || 'cash',
        telebirr_tx_id || null,
        notes || ''
      );

      const ticketId = result.lastInsertRowid;

      const itemStmt = db.prepare(`
        INSERT INTO ticket_items (ticket_id, service_id, service_name, price, barber_commission)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of calculatedItems) {
        itemStmt.run(ticketId, item.service_id || null, item.service_name, item.price, item.barber_commission);
      }

      // If tied to a queue item, mark queue item as completed
      if (queue_id) {
        db.prepare("UPDATE queue SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(queue_id);
      }

      return ticketId;
    });

    const ticketId = insertTx();

    const createdTicket = db.prepare(`
      SELECT t.*, b.name as barber_name, b.amharic_name as barber_amharic_name
      FROM tickets t
      JOIN barbers b ON b.id = t.barber_id
      WHERE t.id = ?
    `).get(ticketId);

    const ticketItems = db.prepare('SELECT * FROM ticket_items WHERE ticket_id = ?').all(ticketId);

    res.json({
      success: true,
      data: {
        ticket: createdTicket,
        items: ticketItems
      }
    });
  } catch (err) {
    console.error('Error in createTicket:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Get recent transactions
function getRecentTickets(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tickets = db.prepare(`
      SELECT t.*, b.name as barber_name
      FROM tickets t
      JOIN barbers b ON b.id = t.barber_id
      ORDER BY t.id DESC
      LIMIT ?
    `).all(limit);

    res.json({ success: true, data: tickets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getPOSInit,
  createTicket,
  getRecentTickets
};
