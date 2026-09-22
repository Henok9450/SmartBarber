const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const posController = require('./controllers/posController');
const barberController = require('./controllers/barberController');
const serviceController = require('./controllers/serviceController');
const queueController = require('./controllers/queueController');
const reportController = require('./controllers/reportController');
const appointmentController = require('./controllers/appointmentController');
const authController = require('./controllers/authController');
const { authenticateUser, requireRole } = require('./middleware/rbac');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Global User Authentication extractor
app.use(authenticateUser);

// Authentication Endpoints
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authController.getMe);
app.get('/api/auth/users', requireRole('owner'), authController.getUsers);
app.put('/api/auth/users/:id/pin', requireRole('owner'), authController.updateUserPin);
app.post('/api/auth/change-pin', authController.changeOwnPin);

// POS Endpoints
app.get('/api/pos/init', posController.getPOSInit);
app.post('/api/pos/ticket', requireRole('owner', 'cashier'), posController.createTicket);
app.get('/api/pos/recent', posController.getRecentTickets);

// Barber Endpoints (Dynamic CRUD + Status)
app.get('/api/barbers', barberController.getAllBarbers);
app.get('/api/barbers/admin', barberController.getAdminBarbers);
app.get('/api/barbers/:id', barberController.getBarberDetail);
app.post('/api/barbers', requireRole('owner'), barberController.createBarber);
app.put('/api/barbers/:id', requireRole('owner'), barberController.updateBarber);
app.delete('/api/barbers/:id', requireRole('owner'), barberController.deleteBarber);
app.post('/api/barbers/:id/status', barberController.updateBarberStatus);

// Services Endpoints (Dynamic CRUD protected for Owner)
app.get('/api/services', serviceController.getServices);
app.get('/api/services/admin', serviceController.getAllServices);
app.post('/api/services', requireRole('owner'), serviceController.createService);
app.put('/api/services/:id', requireRole('owner'), serviceController.updateService);
app.patch('/api/services/:id/price', requireRole('owner'), serviceController.updatePrice);
app.delete('/api/services/:id', requireRole('owner'), serviceController.deleteService);

// Queue & Waiting Line Endpoints (Telegram Mini App & POS)
app.get('/api/queue', queueController.getLiveQueue);
app.post('/api/queue/ticket', queueController.takeTicket);
app.post('/api/queue/:id/call', requireRole('owner', 'cashier', 'barber'), queueController.callCustomer);
app.post('/api/queue/:id/complete', requireRole('owner', 'cashier', 'barber'), queueController.completeTicket);
app.post('/api/queue/:id/cancel', requireRole('owner', 'cashier', 'barber'), queueController.cancelTicket);

// Remote Ordering & Customer Live Turn Tracking (Public / Customer)
app.post('/api/appointments', appointmentController.createAppointment);
app.get('/api/appointments', appointmentController.getAppointments);
app.get('/api/customer/track/:query', appointmentController.trackCustomer);

// Reports & Reconciliation (Protected for Owner & Cashier)
app.get('/api/reports/analytics', requireRole('owner'), reportController.getAnalyticsReport);
app.get('/api/reports/daily', requireRole('owner', 'cashier'), reportController.getDailySettlement);
app.get('/api/reports/historical', requireRole('owner', 'cashier'), reportController.getHistoricalSettlements);
app.get('/api/reports/export-csv', requireRole('owner', 'cashier'), reportController.exportCsvReport);
app.get('/api/reports/telegram', requireRole('owner', 'cashier'), reportController.getTelegramReportText);
app.get('/api/reports/barber/:id', requireRole('owner', 'barber'), reportController.getBarberReport);
app.post('/api/reports/close', requireRole('owner', 'cashier'), reportController.closeDay);

// Settings
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/settings', requireRole('owner'), (req, res) => {
  try {
    const updateStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const updates = req.body;
    const updateTx = db.transaction(() => {
      for (const [k, v] of Object.entries(updates)) {
        updateStmt.run(k, String(v));
      }
    });
    updateTx();
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend build if in production
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Fallback for SPA routing
app.use((req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('SmartBarber Backend API is running on port ' + PORT);
    }
  });
});

app.listen(PORT, () => {
  console.log(`💈 SmartBarber Server listening on http://localhost:${PORT}`);
});
