const db = require('../database/db');

// Create Remote Booking / Order
function createAppointment(req, res) {
  try {
    const {
      customer_name,
      customer_phone,
      barber_id,
      service_id,
      appointment_date,
      appointment_time,
      booking_type = 'remote_queue', // 'remote_queue' or 'scheduled_slot'
      deposit_paid = 0,
      telebirr_tx_id = null,
      notes = ''
    } = req.body;

    if (!customer_name || !customer_phone) {
      return res.status(400).json({ success: false, error: 'Customer name and phone number are required' });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const targetDate = appointment_date || todayDate;
    const targetTime = appointment_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let queueTicket = null;

    // If joining the queue remotely right now, also push into active queue
    if (booking_type === 'remote_queue') {
      const countRow = db.prepare("SELECT COUNT(*) as count FROM queue WHERE DATE(created_at, 'localtime') = DATE('now', 'localtime')").get();
      const ticketSeq = 100 + countRow.count + 1;
      const ticket_number = `T-${ticketSeq}`;

      // Auto-assign barber if not specified
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
        if (bestBarber) assignedBarberId = bestBarber.id;
      }

      const qResult = db.prepare(`
        INSERT INTO queue (ticket_number, customer_name, customer_phone, barber_id, service_id, status)
        VALUES (?, ?, ?, ?, ?, 'waiting')
      `).run(ticket_number, customer_name, customer_phone, assignedBarberId || null, service_id || null);

      queueTicket = db.prepare('SELECT * FROM queue WHERE id = ?').get(qResult.lastInsertRowid);
    }

    // Insert appointment record
    const apptStmt = db.prepare(`
      INSERT INTO appointments (
        customer_name, customer_phone, barber_id, service_id,
        appointment_date, appointment_time, deposit_paid, telebirr_tx_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
    `);

    const apptResult = apptStmt.run(
      customer_name,
      customer_phone,
      barber_id || null,
      service_id || null,
      targetDate,
      targetTime,
      parseFloat(deposit_paid) || 0,
      telebirr_tx_id || null
    );

    const createdAppt = db.prepare(`
      SELECT a.*, b.name as barber_name, b.amharic_name as barber_amharic_name, b.chair_number,
        s.name as service_name, s.amharic_name as service_amharic_name, s.price
      FROM appointments a
      LEFT JOIN barbers b ON b.id = a.barber_id
      LEFT JOIN services s ON s.id = a.service_id
      WHERE a.id = ?
    `).get(apptResult.lastInsertRowid);

    res.json({
      success: true,
      data: {
        appointment: createdAppt,
        queueTicket
      },
      message: 'Remote booking placed successfully'
    });
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Customer Live Tracking by Phone or Ticket Number
function trackCustomer(req, res) {
  try {
    const { query } = req.params; // phone or ticket number

    // Search in active queue first
    const activeTicket = db.prepare(`
      SELECT q.*, 
        b.name as barber_name, b.amharic_name as barber_amharic_name, b.chair_number,
        s.name as service_name, s.amharic_name as service_amharic_name, s.price, s.duration_minutes
      FROM queue q
      LEFT JOIN barbers b ON b.id = q.barber_id
      LEFT JOIN services s ON s.id = q.service_id
      WHERE (q.customer_phone = ? OR q.ticket_number = ?)
        AND q.status IN ('waiting', 'in_chair')
      ORDER BY q.id DESC
      LIMIT 1
    `).get(query, query);

    if (!activeTicket) {
      // Check appointments
      const appt = db.prepare(`
        SELECT a.*, 
          b.name as barber_name, b.amharic_name as barber_amharic_name, b.chair_number,
          s.name as service_name, s.amharic_name as service_amharic_name, s.price
        FROM appointments a
        LEFT JOIN barbers b ON b.id = a.barber_id
        LEFT JOIN services s ON s.id = a.service_id
        WHERE a.customer_phone = ? AND a.status = 'confirmed'
        ORDER BY a.id DESC
        LIMIT 1
      `).get(query);

      if (appt) {
        return res.json({
          success: true,
          type: 'appointment',
          data: {
            ...appt,
            guidance: {
              status: 'scheduled',
              message: `Your appointment is confirmed for ${appt.appointment_date} at ${appt.appointment_time}.`,
              stage: 'scheduled'
            }
          }
        });
      }

      return res.status(404).json({ success: false, error: 'No active queue or appointment found for this phone or ticket number.' });
    }

    // Calculate queue position
    const positionRow = db.prepare(`
      SELECT COUNT(*) as pos
      FROM queue
      WHERE id < ? AND status = 'waiting'
        ${activeTicket.barber_id ? 'AND barber_id = ' + activeTicket.barber_id : ''}
    `).get(activeTicket.id);

    const peopleAhead = activeTicket.status === 'in_chair' ? 0 : positionRow.pos;
    const estWaitMins = activeTicket.status === 'in_chair' ? 0 : Math.max(5, (peopleAhead + 1) * 20);

    // Guidance status for the customer
    let stage = 'relax'; // relax, head_out, in_chair
    let alertMessage = '';
    let amharicMessage = '';

    if (activeTicket.status === 'in_chair') {
      stage = 'in_chair';
      alertMessage = `Your chair (#${activeTicket.chair_number || '1'}) is ready with ${activeTicket.barber_name}! Come in now!`;
      amharicMessage = `ወንበር ቁጥር ${activeTicket.chair_number || '1'} ከባርበር ${activeTicket.barber_amharic_name || activeTicket.barber_name} ጋር ዝግጁ ነው! አሁን ይግቡ!`;
    } else if (peopleAhead <= 1 || estWaitMins <= 15) {
      stage = 'head_out';
      alertMessage = `You are next in line (${peopleAhead} ahead, ~${estWaitMins} mins)! Time to head over to the shop.`;
      amharicMessage = `የእርስዎ ተራ ደርሷል (ከእርስዎ በፊት ${peopleAhead} ሰው ብቻ ቀርቷል)! ወደ ሱቁ ይምጡ።`;
    } else {
      stage = 'relax';
      alertMessage = `Relax at home or cafe. ${peopleAhead} people ahead. Estimated wait is ~${estWaitMins} mins.`;
      amharicMessage = `ከቤትዎ ወይም ካፌ ሆነው ይጠብቁ። ከእርስዎ በፊት ${peopleAhead} ሰዎች አሉ። የሚገመተው ጊዜ ~${estWaitMins} ደቂቃ።`;
    }

    res.json({
      success: true,
      type: 'queue',
      data: {
        ticket: activeTicket,
        people_ahead: peopleAhead,
        estimated_wait_mins: estWaitMins,
        guidance: {
          stage,
          alertMessage,
          amharicMessage
        }
      }
    });
  } catch (err) {
    console.error('Error tracking customer:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// List all appointments
function getAppointments(req, res) {
  try {
    const list = db.prepare(`
      SELECT a.*, 
        b.name as barber_name, b.amharic_name as barber_amharic_name, b.chair_number,
        s.name as service_name, s.amharic_name as service_amharic_name, s.price
      FROM appointments a
      LEFT JOIN barbers b ON b.id = a.barber_id
      LEFT JOIN services s ON s.id = a.service_id
      ORDER BY a.appointment_date DESC, a.appointment_time ASC
      LIMIT 50
    `).all();

    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  createAppointment,
  trackCustomer,
  getAppointments
};
