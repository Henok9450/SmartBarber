const db = require('../database/db');

// Get active queue with wait time calculation
function getLiveQueue(req, res) {
  try {
    const queue = db.prepare(`
      SELECT q.*, 
        b.name as barber_name, b.amharic_name as barber_amharic_name, b.chair_number,
        s.name as service_name, s.amharic_name as service_amharic_name, s.price, s.duration_minutes
      FROM queue q
      LEFT JOIN barbers b ON b.id = q.barber_id
      LEFT JOIN services s ON s.id = q.service_id
      WHERE q.status IN ('waiting', 'in_chair')
      ORDER BY 
        CASE WHEN q.status = 'in_chair' THEN 1 ELSE 2 END,
        q.id ASC
    `).all();

    // Group by barbers to calculate specific wait times
    const barbers = db.prepare(`
      SELECT b.id, b.name, b.amharic_name, b.chair_number, b.status,
        (SELECT COUNT(*) FROM queue WHERE barber_id = b.id AND status = 'waiting') as waiting_count,
        (SELECT ticket_number FROM queue WHERE barber_id = b.id AND status = 'in_chair' LIMIT 1) as current_ticket
      FROM barbers b
      WHERE b.is_active = 1
      ORDER BY b.chair_number ASC
    `).all();

    const summary = {
      total_waiting: queue.filter(q => q.status === 'waiting').length,
      currently_in_chair: queue.filter(q => q.status === 'in_chair').length,
      estimated_avg_wait: Math.max(10, queue.filter(q => q.status === 'waiting').length * 20)
    };

    res.json({
      success: true,
      data: {
        queue,
        barbers,
        summary
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Customer or Cashier creates a queue ticket
function takeTicket(req, res) {
  try {
    const { customer_name, customer_phone, barber_id, service_id } = req.body;

    if (!customer_name) {
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }

    // Auto-generate ticket number
    const countRow = db.prepare("SELECT COUNT(*) as count FROM queue WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')").get();
    const ticketSeq = 100 + countRow.count + 1;
    const ticket_number = `T-${ticketSeq}`;

    // Auto-select barber with least waiting queue if barber_id is not specified
    let assignedBarberId = barber_id;
    if (!assignedBarberId) {
      const bestBarber = db.prepare(`
        SELECT b.id, COUNT(q.id) as queue_count
        FROM barbers b
        LEFT JOIN queue q ON q.barber_id = b.id AND q.status IN ('waiting', 'in_chair')
        WHERE b.status != 'off' AND b.is_active = 1
        GROUP BY b.id
        ORDER BY queue_count ASC, b.chair_number ASC
        LIMIT 1
      `).get();

      if (bestBarber) {
        assignedBarberId = bestBarber.id;
      }
    }

    const stmt = db.prepare(`
      INSERT INTO queue (ticket_number, customer_name, customer_phone, barber_id, service_id, status)
      VALUES (?, ?, ?, ?, ?, 'waiting')
    `);

    const result = stmt.run(
      ticket_number,
      customer_name,
      customer_phone || '',
      assignedBarberId || null,
      service_id || null
    );

    // Calculate queue position and wait time
    const positionRow = db.prepare(`
      SELECT COUNT(*) as pos
      FROM queue
      WHERE id <= ? AND status = 'waiting'
    `).get(result.lastInsertRowid);

    const createdTicket = db.prepare(`
      SELECT q.*, b.name as barber_name, b.amharic_name as barber_amharic_name, s.name as service_name
      FROM queue q
      LEFT JOIN barbers b ON b.id = q.barber_id
      LEFT JOIN services s ON s.id = q.service_id
      WHERE q.id = ?
    `).get(result.lastInsertRowid);

    res.json({
      success: true,
      data: {
        ticket: createdTicket,
        queue_position: positionRow.pos,
        estimated_wait_mins: Math.max(5, (positionRow.pos - 1) * 20)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Move ticket to 'in_chair'
function callCustomer(req, res) {
  try {
    const { id } = req.params;
    const queueItem = db.prepare('SELECT * FROM queue WHERE id = ?').get(id);

    if (!queueItem) {
      return res.status(404).json({ success: false, error: 'Queue ticket not found' });
    }

    db.prepare(`
      UPDATE queue 
      SET status = 'in_chair', started_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    if (queueItem.barber_id) {
      db.prepare("UPDATE barbers SET status = 'busy' WHERE id = ?").run(queueItem.barber_id);
    }

    res.json({ success: true, message: 'Customer called to chair' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Complete ticket when haircut is finished
function completeTicket(req, res) {
  try {
    const { id } = req.params;
    const queueItem = db.prepare('SELECT * FROM queue WHERE id = ?').get(id);

    if (!queueItem) {
      return res.status(404).json({ success: false, error: 'Queue ticket not found' });
    }

    db.prepare(`
      UPDATE queue 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    // Free barber chair if no other customer is in chair for this barber
    if (queueItem.barber_id) {
      const otherInChair = db.prepare("SELECT COUNT(*) as c FROM queue WHERE barber_id = ? AND status = 'in_chair' AND id != ?").get(queueItem.barber_id, id);
      if (otherInChair.c === 0) {
        db.prepare("UPDATE barbers SET status = 'active' WHERE id = ?").run(queueItem.barber_id);
      }
    }

    res.json({ success: true, message: 'Cut finished and chair freed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Cancel ticket
function cancelTicket(req, res) {
  try {
    const { id } = req.params;
    db.prepare("UPDATE queue SET status = 'cancelled' WHERE id = ?").run(id);
    res.json({ success: true, message: 'Ticket cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getLiveQueue,
  takeTicket,
  callCustomer,
  completeTicket,
  cancelTicket
};
