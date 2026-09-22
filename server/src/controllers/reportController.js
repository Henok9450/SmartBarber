const db = require('../database/db');

// Helper to construct dynamic WHERE clauses for reports
function buildFilter(query, tableAlias = 't') {
  const { period = 'today', start_date, end_date, barber_id, payment_method } = query;
  const conditions = [];
  const params = [];

  if (start_date && end_date) {
    conditions.push(`${tableAlias}.settlement_date >= ? AND ${tableAlias}.settlement_date <= ?`);
    params.push(start_date, end_date);
  } else if (start_date) {
    conditions.push(`${tableAlias}.settlement_date >= ?`);
    params.push(start_date);
  } else if (period === 'today') {
    conditions.push(`${tableAlias}.settlement_date = DATE('now', 'localtime')`);
  } else if (period === 'yesterday') {
    conditions.push(`${tableAlias}.settlement_date = DATE('now', '-1 day', 'localtime')`);
  } else if (period === 'week') {
    conditions.push(`${tableAlias}.settlement_date >= DATE('now', '-7 days', 'localtime')`);
  } else if (period === 'month') {
    conditions.push(`${tableAlias}.settlement_date >= DATE('now', 'start of month', 'localtime')`);
  } else if (period === 'year') {
    conditions.push(`${tableAlias}.settlement_date >= DATE('now', 'start of year', 'localtime')`);
  } else if (period === 'all') {
    // No date restriction
  } else {
    // Default today
    conditions.push(`${tableAlias}.settlement_date = DATE('now', 'localtime')`);
  }

  if (barber_id && barber_id !== 'all') {
    conditions.push(`${tableAlias}.barber_id = ?`);
    params.push(parseInt(barber_id));
  }

  if (payment_method && payment_method !== 'all') {
    conditions.push(`${tableAlias}.payment_method = ?`);
    params.push(payment_method);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereClause, conditions, params };
}

// Comprehensive Business Analytics with Multi-Filtering (Owner)
function getAnalyticsReport(req, res) {
  try {
    const filter = buildFilter(req.query);

    // 1. Executive KPIs
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_cuts,
        COALESCE(SUM(t.total_amount), 0) as gross_revenue,
        COALESCE(SUM(t.barber_commission), 0) as total_commissions,
        COALESCE(SUM(t.shop_share), 0) as net_shop_profit,
        COALESCE(SUM(t.tip_amount), 0) as total_tips,
        COALESCE(AVG(t.total_amount), 0) as avg_ticket_value,
        COALESCE(SUM(CASE WHEN t.payment_method = 'telebirr' THEN t.total_amount ELSE 0 END), 0) as telebirr_total,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cbe_birr' THEN t.total_amount ELSE 0 END), 0) as cbe_total,
        COALESCE(SUM(CASE WHEN t.payment_method = 'card' THEN t.total_amount ELSE 0 END), 0) as card_total
      FROM tickets t
      ${filter.whereClause}
    `).get(...filter.params);

    const gross = totals.gross_revenue || 1; // avoid divide by zero
    const channels = [
      { name: 'Telebirr', code: 'telebirr', amount: totals.telebirr_total, share: Math.round((totals.telebirr_total / gross) * 100) },
      { name: 'Direct Cash', code: 'cash', amount: totals.cash_total, share: Math.round((totals.cash_total / gross) * 100) },
      { name: 'CBE Birr', code: 'cbe_birr', amount: totals.cbe_total, share: Math.round((totals.cbe_total / gross) * 100) },
      { name: 'Card / POS', code: 'card', amount: totals.card_total, share: Math.round((totals.card_total / gross) * 100) }
    ].filter(c => c.amount > 0);

    // 2. Barber Comparison
    // Join tickets with filter criteria
    let ticketJoinCond = filter.conditions.join(' AND ');
    const barberBreakdown = db.prepare(`
      SELECT 
        b.id,
        b.name,
        b.amharic_name,
        b.chair_number,
        COUNT(t.id) as cuts_count,
        COALESCE(SUM(t.total_amount), 0) as volume_generated,
        COALESCE(SUM(t.barber_commission), 0) as commission_earned,
        COALESCE(SUM(t.tip_amount), 0) as tips_earned,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.total_amount ELSE 0 END), 0) as cash_collected,
        COALESCE(SUM(CASE WHEN t.payment_method = 'telebirr' THEN t.total_amount ELSE 0 END), 0) as telebirr_collected
      FROM barbers b
      LEFT JOIN tickets t ON t.barber_id = b.id ${ticketJoinCond ? 'AND ' + ticketJoinCond : ''}
      WHERE b.is_active = 1
      GROUP BY b.id
      ORDER BY volume_generated DESC
    `).all(...filter.params);

    const formattedBarbers = barberBreakdown.map(b => {
      const totalEarned = b.commission_earned + b.tips_earned;
      const settlementBalance = totalEarned; // All payments collected by cashier/POS
      return {
        ...b,
        total_earned: totalEarned,
        settlement_balance: settlementBalance,
        volume_share: Math.round(((b.volume_generated || 0) / gross) * 100),
        settlement_action: `Shop pays Barber ${settlementBalance.toFixed(2)} ETB`
      };
    });

    // 3. Top Services Breakdown
    const serviceBreakdown = db.prepare(`
      SELECT 
        ti.service_name,
        COUNT(ti.id) as quantity,
        COALESCE(SUM(ti.price), 0) as total_revenue,
        COALESCE(SUM(ti.barber_commission), 0) as total_commission
      FROM ticket_items ti
      JOIN tickets t ON t.id = ti.ticket_id
      ${filter.whereClause}
      GROUP BY ti.service_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `).all(...filter.params);

    // 4. Daily Timeline / Trend
    const dailyTimeline = db.prepare(`
      SELECT 
        t.settlement_date as date,
        COUNT(t.id) as cuts,
        COALESCE(SUM(t.total_amount), 0) as revenue,
        COALESCE(SUM(t.shop_share), 0) as shop_profit,
        COALESCE(SUM(t.barber_commission), 0) as commissions
      FROM tickets t
      ${filter.whereClause}
      GROUP BY t.settlement_date
      ORDER BY t.settlement_date ASC
    `).all(...filter.params);

    // 5. Filtered Transactions List
    const tickets = db.prepare(`
      SELECT 
        t.id,
        t.ticket_number,
        t.customer_name,
        t.customer_phone,
        t.total_amount,
        t.barber_commission,
        t.shop_share,
        t.tip_amount,
        t.payment_method,
        t.telebirr_tx_id,
        t.created_at,
        t.settlement_date,
        b.name as barber_name,
        b.chair_number,
        GROUP_CONCAT(ti.service_name, ', ') as services_rendered
      FROM tickets t
      LEFT JOIN barbers b ON b.id = t.barber_id
      LEFT JOIN ticket_items ti ON ti.ticket_id = t.id
      ${filter.whereClause}
      GROUP BY t.id
      ORDER BY t.id DESC
      LIMIT 100
    `).all(...filter.params);

    res.json({
      success: true,
      data: {
        filter: req.query,
        totals,
        channels,
        barbers: formattedBarbers,
        services: serviceBreakdown,
        dailyTimeline,
        tickets
      }
    });
  } catch (err) {
    console.error('Error in getAnalyticsReport:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Barber Specific Performance & History Report
function getBarberReport(req, res) {
  try {
    const { id } = req.params;
    const barber = db.prepare('SELECT * FROM barbers WHERE id = ?').get(id);

    if (!barber) {
      return res.status(404).json({ success: false, error: 'Barber not found' });
    }

    const filter = buildFilter({ ...req.query, barber_id: id });

    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_cuts,
        COALESCE(SUM(total_amount), 0) as total_volume,
        COALESCE(SUM(barber_commission), 0) as total_commission,
        COALESCE(SUM(tip_amount), 0) as total_tips,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as direct_cash_in_hand,
        COALESCE(SUM(CASE WHEN payment_method = 'telebirr' THEN total_amount ELSE 0 END), 0) as telebirr_volume
      FROM tickets t
      ${filter.whereClause}
    `).get(...filter.params);

    const totalEarnings = (summary.total_commission || 0) + (summary.total_tips || 0);
    const netPayout = totalEarnings; // Cashier holds all funds

    // Timeline for this barber
    const timeline = db.prepare(`
      SELECT 
        t.settlement_date as date,
        COUNT(t.id) as cuts,
        COALESCE(SUM(t.total_amount), 0) as volume,
        COALESCE(SUM(t.barber_commission), 0) as commission,
        COALESCE(SUM(t.tip_amount), 0) as tips
      FROM tickets t
      ${filter.whereClause}
      GROUP BY t.settlement_date
      ORDER BY t.settlement_date DESC
    `).all(...filter.params);

    // Individual tickets
    const tickets = db.prepare(`
      SELECT 
        t.id, t.ticket_number, t.customer_name, t.total_amount,
        t.barber_commission, t.tip_amount, t.payment_method, t.created_at,
        t.settlement_date,
        GROUP_CONCAT(ti.service_name, ', ') as services_rendered
      FROM tickets t
      LEFT JOIN ticket_items ti ON ti.ticket_id = t.id
      ${filter.whereClause}
      GROUP BY t.id
      ORDER BY t.id DESC
      LIMIT 100
    `).all(...filter.params);

    res.json({
      success: true,
      data: {
        barber,
        summary: {
          ...summary,
          total_earnings: totalEarnings,
          net_payout: netPayout
        },
        timeline,
        tickets
      }
    });
  } catch (err) {
    console.error('Error in getBarberReport:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Daily settlement calculations & reconciliation
function getDailySettlement(req, res) {
  try {
    const targetDate = req.query.date || null;
    const dateClause = targetDate ? "settlement_date = ?" : "settlement_date = DATE('now', 'localtime')";
    const dateParam = targetDate ? [targetDate] : [];

    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_cuts,
        COALESCE(SUM(total_amount), 0) as gross_revenue,
        COALESCE(SUM(barber_commission), 0) as total_commissions,
        COALESCE(SUM(shop_share), 0) as net_shop_profit,
        COALESCE(SUM(tip_amount), 0) as total_tips,
        COALESCE(SUM(CASE WHEN payment_method = 'telebirr' THEN total_amount ELSE 0 END), 0) as telebirr_total,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'cbe_birr' THEN total_amount ELSE 0 END), 0) as cbe_total
      FROM tickets
      WHERE ${dateClause}
    `).get(...dateParam);

    const barberBreakdown = db.prepare(`
      SELECT 
        b.id,
        b.name,
        b.amharic_name,
        b.chair_number,
        COUNT(t.id) as cuts_count,
        COALESCE(SUM(t.total_amount), 0) as volume_generated,
        COALESCE(SUM(t.barber_commission), 0) as commission_earned,
        COALESCE(SUM(t.tip_amount), 0) as tips_earned,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.total_amount ELSE 0 END), 0) as cash_collected,
        COALESCE(SUM(CASE WHEN t.payment_method = 'telebirr' THEN t.total_amount ELSE 0 END), 0) as telebirr_collected
      FROM barbers b
      LEFT JOIN tickets t ON t.barber_id = b.id AND t.${dateClause}
      WHERE b.is_active = 1
      GROUP BY b.id
      ORDER BY volume_generated DESC
    `).all(...dateParam);

    const formattedBarbers = barberBreakdown.map(b => {
      const totalEarned = b.commission_earned + b.tips_earned;
      const settlementBalance = totalEarned; // All payments collected by cashier/POS
      return {
        ...b,
        total_earned: totalEarned,
        settlement_balance: settlementBalance,
        settlement_action: `Shop pays Barber ${settlementBalance.toFixed(2)} ETB`
      };
    });

    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const settlementRow = db.prepare('SELECT * FROM daily_settlements WHERE settlement_date = ?').get(dateStr);

    res.json({
      success: true,
      data: {
        date: dateStr,
        totals,
        barbers: formattedBarbers,
        is_closed: settlementRow ? settlementRow.status === 'closed' : false,
        closed_at: settlementRow ? settlementRow.closed_at : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Historical Settlements list
function getHistoricalSettlements(req, res) {
  try {
    const rows = db.prepare(`
      SELECT * FROM daily_settlements
      ORDER BY settlement_date DESC
      LIMIT 30
    `).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Export Filtered Tickets to CSV
function exportCsvReport(req, res) {
  try {
    const filter = buildFilter(req.query);
    const tickets = db.prepare(`
      SELECT 
        t.ticket_number,
        t.settlement_date,
        t.created_at,
        t.customer_name,
        t.customer_phone,
        b.name as barber_name,
        b.chair_number,
        t.total_amount,
        t.barber_commission,
        t.shop_share,
        t.tip_amount,
        t.payment_method,
        t.telebirr_tx_id,
        GROUP_CONCAT(ti.service_name, '; ') as services_rendered
      FROM tickets t
      LEFT JOIN barbers b ON b.id = t.barber_id
      LEFT JOIN ticket_items ti ON ti.ticket_id = t.id
      ${filter.whereClause}
      GROUP BY t.id
      ORDER BY t.id DESC
    `).all(...filter.params);

    const headers = [
      'Ticket Number', 'Date', 'Time', 'Customer Name', 'Phone',
      'Barber', 'Chair', 'Services', 'Total Amount (ETB)',
      'Barber Share (ETB)', 'Shop Net (ETB)', 'Tip (ETB)',
      'Payment Method', 'Telebirr Tx ID'
    ];

    let csvContent = headers.join(',') + '\n';
    tickets.forEach(t => {
      const time = t.created_at ? t.created_at.split(' ')[1] || t.created_at : '';
      const row = [
        `"${t.ticket_number || ''}"`,
        `"${t.settlement_date || ''}"`,
        `"${time}"`,
        `"${(t.customer_name || '').replace(/"/g, '""')}"`,
        `"${t.customer_phone || ''}"`,
        `"${(t.barber_name || '').replace(/"/g, '""')}"`,
        `"${t.chair_number || ''}"`,
        `"${(t.services_rendered || '').replace(/"/g, '""')}"`,
        t.total_amount || 0,
        t.barber_commission || 0,
        t.shop_share || 0,
        t.tip_amount || 0,
        `"${t.payment_method || ''}"`,
        `"${t.telebirr_tx_id || ''}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="smartbarber-report-${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('Error in exportCsvReport:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Generate formatted Telegram Bot message report
function getTelegramReportText(req, res) {
  try {
    const settings = {};
    db.prepare('SELECT key, value FROM settings').all().forEach(s => settings[s.key] = s.value);

    const filter = buildFilter(req.query);

    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_cuts,
        COALESCE(SUM(t.total_amount), 0) as gross_revenue,
        COALESCE(SUM(t.barber_commission), 0) as total_commissions,
        COALESCE(SUM(t.shop_share), 0) as net_shop_profit,
        COALESCE(SUM(t.tip_amount), 0) as total_tips,
        COALESCE(SUM(CASE WHEN t.payment_method = 'telebirr' THEN t.total_amount ELSE 0 END), 0) as telebirr_total,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cbe_birr' THEN t.total_amount ELSE 0 END), 0) as cbe_total,
        COALESCE(SUM(CASE WHEN t.payment_method = 'card' THEN t.total_amount ELSE 0 END), 0) as card_total
      FROM tickets t
      ${filter.whereClause}
    `).get(...filter.params);

    const barbers = db.prepare(`
      SELECT 
        b.name,
        COUNT(t.id) as cuts,
        COALESCE(SUM(t.total_amount), 0) as volume,
        COALESCE(SUM(t.barber_commission), 0) as comm,
        COALESCE(SUM(t.tip_amount), 0) as tips,
        COALESCE(SUM(CASE WHEN t.payment_method = 'cash' THEN t.total_amount ELSE 0 END), 0) as cash
      FROM barbers b
      LEFT JOIN tickets t ON t.barber_id = b.id ${filter.conditions.length ? 'AND ' + filter.conditions.join(' AND ') : ''}
      WHERE b.is_active = 1
      GROUP BY b.id
      HAVING cuts > 0
      ORDER BY volume DESC
    `).all(...filter.params);

    const dateLabel = req.query.period ? `Period: ${req.query.period.toUpperCase()}` : `Date: ${new Date().toLocaleDateString('en-GB')}`;

    let message = `💈 *${settings.shop_name || 'SmartBarber'}* 💈\n`;
    if (settings.branch_name) {
      message += `📍 *Branch:* ${settings.branch_name}\n`;
    }
    if (settings.address) {
      message += `🏢 *Address:* ${settings.address}\n`;
    }
    message += `📅 *Financial Report (${dateLabel})*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `💰 *Gross Revenue:* ${totals.gross_revenue.toLocaleString()} ETB\n`;
    message += `✂️ *Total Cuts / Services:* ${totals.total_cuts}\n`;
    message += `🏦 *Shop Net Profit:* ${totals.net_shop_profit.toLocaleString()} ETB\n`;
    message += `👥 *Barber Payouts:* ${(totals.total_commissions + totals.total_tips).toLocaleString()} ETB\n`;
    if (totals.total_tips > 0) {
      message += `🎁 *Client Tips Collected:* ${totals.total_tips.toLocaleString()} ETB\n`;
    }
    message += `\n`;
    message += `📱 *Payment Channel Breakdown:*\n`;
    message += ` • Telebirr: ${totals.telebirr_total.toLocaleString()} ETB\n`;
    message += ` • Direct Cash: ${totals.cash_total.toLocaleString()} ETB\n`;
    message += ` • CBE Birr: ${totals.cbe_total.toLocaleString()} ETB\n`;
    if (totals.card_total > 0) {
      message += ` • Card / Bank POS: ${totals.card_total.toLocaleString()} ETB\n`;
    }
    message += `\n✂️ *Barber Settlements:*\n`;

    barbers.forEach((b, idx) => {
      const totalPayout = b.comm + b.tips;
      const tipText = b.tips > 0 ? ` + ${b.tips.toLocaleString()} ETB tip` : '';
      message += `${idx + 1}. *${b.name}*: ${b.cuts} cuts | ${b.comm.toLocaleString()} ETB comm${tipText}\n   👉 Payout: ${totalPayout.toLocaleString()} ETB\n`;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `✅ *Generated by SmartBarber ET POS*`;

    res.json({ success: true, text: message });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Close the day
function closeDay(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const totals = db.prepare(`
      SELECT 
        COUNT(*) as total_cuts,
        COALESCE(SUM(total_amount), 0) as gross_revenue,
        COALESCE(SUM(barber_commission), 0) as total_commissions,
        COALESCE(SUM(shop_share), 0) as net_shop_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'telebirr' THEN total_amount ELSE 0 END), 0) as telebirr_total,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'cbe_birr' THEN total_amount ELSE 0 END), 0) as cbe_total
      FROM tickets
      WHERE settlement_date = DATE('now', 'localtime')
    `).get();

    db.prepare(`
      INSERT INTO daily_settlements (
        settlement_date, total_revenue, total_cash, total_telebirr, total_cbe,
        total_commission, total_shop_profit, total_cuts, status, closed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'closed', CURRENT_TIMESTAMP)
      ON CONFLICT(settlement_date) DO UPDATE SET
        total_revenue = excluded.total_revenue,
        total_cash = excluded.total_cash,
        total_telebirr = excluded.total_telebirr,
        total_cbe = excluded.total_cbe,
        total_commission = excluded.total_commission,
        total_shop_profit = excluded.total_shop_profit,
        total_cuts = excluded.total_cuts,
        status = 'closed',
        closed_at = CURRENT_TIMESTAMP
    `).run(
      today,
      totals.gross_revenue,
      totals.cash_total,
      totals.telebirr_total,
      totals.cbe_total,
      totals.total_commissions,
      totals.net_shop_profit,
      totals.total_cuts
    );

    res.json({ success: true, message: 'Day closed and locked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getDailySettlement,
  getAnalyticsReport,
  getBarberReport,
  getHistoricalSettlements,
  exportCsvReport,
  getTelegramReportText,
  closeDay
};
