const db = require('../database/db');

// List active services
function getServices(req, res) {
  try {
    const services = db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY category, price ASC').all();
    res.json({ success: true, data: services });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// List all services (including inactive for admin)
function getAllServices(req, res) {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY category, price ASC').all();
    res.json({ success: true, data: services });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Create new service
function createService(req, res) {
  try {
    const { name, amharic_name, category = 'haircut', price, duration_minutes = 25, commission_rate = 0.50 } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: 'Name and price are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO services (name, amharic_name, category, price, duration_minutes, commission_rate, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    const result = stmt.run(
      name.trim(),
      amharic_name ? amharic_name.trim() : name.trim(),
      category,
      parseFloat(price),
      parseInt(duration_minutes) || 0,
      parseFloat(commission_rate) || 0.50
    );

    const newService = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, data: newService, message: 'Service created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Update existing service
function updateService(req, res) {
  try {
    const { id } = req.params;
    const { name, amharic_name, category, price, duration_minutes, commission_rate, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Service not found' });
    }

    const stmt = db.prepare(`
      UPDATE services SET
        name = ?,
        amharic_name = ?,
        category = ?,
        price = ?,
        duration_minutes = ?,
        commission_rate = ?,
        is_active = ?
      WHERE id = ?
    `);

    stmt.run(
      name !== undefined ? name.trim() : existing.name,
      amharic_name !== undefined ? amharic_name.trim() : existing.amharic_name,
      category !== undefined ? category : existing.category,
      price !== undefined ? parseFloat(price) : existing.price,
      duration_minutes !== undefined ? parseInt(duration_minutes) : existing.duration_minutes,
      commission_rate !== undefined ? parseFloat(commission_rate) : existing.commission_rate,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      id
    );

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Service updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Quick Price Update endpoint
function updatePrice(req, res) {
  try {
    const { id } = req.params;
    const { price } = req.body;

    if (price === undefined || isNaN(parseFloat(price))) {
      return res.status(400).json({ success: false, error: 'Valid price is required' });
    }

    db.prepare('UPDATE services SET price = ? WHERE id = ?').run(parseFloat(price), id);
    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    res.json({ success: true, data: updated, message: 'Price updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Delete service (or deactivate)
function deleteService(req, res) {
  try {
    const { id } = req.params;
    // Check if tickets reference it
    const refs = db.prepare('SELECT COUNT(*) as count FROM ticket_items WHERE service_id = ?').get(id);
    if (refs.count === 0) {
      db.prepare('DELETE FROM services WHERE id = ?').run(id);
      res.json({ success: true, message: 'Service deleted permanently' });
    } else {
      db.prepare('UPDATE services SET is_active = 0 WHERE id = ?').run(id);
      res.json({ success: true, message: 'Service deactivated (referenced in past receipts)' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getServices,
  getAllServices,
  createService,
  updateService,
  updatePrice,
  deleteService
};
