import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Users, Scissors, Award, Download, 
  Send, RefreshCw, Filter, Calendar, Search, CreditCard, ChevronRight, Check
} from 'lucide-react';
import { authFetch } from '../utils/auth';

export default function OwnerReportsView({ lang, barbersList }) {
  const isAm = lang === 'am';

  const [period, setPeriod] = useState('today'); // 'today', 'yesterday', 'week', 'month', 'all', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [telegramText, setTelegramText] = useState('');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch report data based on active filters
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (period === 'custom') {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
      }
      if (selectedBarber !== 'all') params.append('barber_id', selectedBarber);
      if (selectedPayment !== 'all') params.append('payment_method', selectedPayment);

      const res = await authFetch(`/api/reports/analytics?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching analytics report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, selectedBarber, selectedPayment]);

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  // CSV Export
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    params.append('period', period);
    if (period === 'custom') {
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
    }
    if (selectedBarber !== 'all') params.append('barber_id', selectedBarber);
    if (selectedPayment !== 'all') params.append('payment_method', selectedPayment);

    authFetch(`/api/reports/export-csv?${params.toString()}`)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SmartBarber_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => console.error('CSV export failed:', err));
  };

  // Telegram Summary
  const handleOpenTelegram = async () => {
    try {
      const res = await authFetch('/api/reports/telegram');
      const json = await res.json();
      if (json.success) {
        setTelegramText(json.text);
        setShowTelegramModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyTelegram = () => {
    navigator.clipboard.writeText(telegramText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const totals = data?.totals || {};
  const channels = data?.channels || [];
  const barberLeaderboard = data?.barbers || data?.barberLeaderboard || [];
  const topServices = data?.services || data?.topServices || [];
  const transactions = data?.tickets || data?.transactions || [];

  // Filter transactions in memory by customer / ticket search query
  const filteredTransactions = transactions.filter(tx => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (tx.ticket_number && tx.ticket_number.toLowerCase().includes(q)) ||
      (tx.customer_name && tx.customer_name.toLowerCase().includes(q)) ||
      (tx.customer_phone && tx.customer_phone.includes(q)) ||
      (tx.barber_name && tx.barber_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <TrendingUp className="text-amber-400" size={20} />
              {isAm ? 'የንግድ እንቅስቃሴና ገቢ ሪፖርት' : 'Executive Financial & Analytics Report'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAm ? 'የገቢ፣ የኮሚሽን፣ የክፍያ አማራጮች እና የባርበሮች ንፅፅር' : 'Filter by period, barber, or payment method. Export to CSV or Telegram.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition cursor-pointer"
              title="Export filtered records to Excel/CSV"
            >
              <Download size={14} />
              <span>{isAm ? 'CSV አውርድ' : 'Export CSV'}</span>
            </button>
            <button
              onClick={handleOpenTelegram}
              className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/20 transition cursor-pointer"
              title="Copy Telegram daily brief format"
            >
              <Send size={14} />
              <span>Telegram</span>
            </button>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Refresh report"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Period Pill Selector */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
            <Calendar size={13} />
            {isAm ? 'ጊዜ:' : 'Period:'}
          </span>
          {[
            { id: 'today', label: isAm ? 'ዛሬ' : 'Today' },
            { id: 'yesterday', label: isAm ? 'ትላንት' : 'Yesterday' },
            { id: 'week', label: isAm ? 'ያለፉት 7 ቀናት' : 'Last 7 Days' },
            { id: 'month', label: isAm ? 'የዚህ ወር' : 'This Month' },
            { id: 'all', label: isAm ? 'ሁሉንም' : 'All Time' },
            { id: 'custom', label: isAm ? 'የተወሰነ ቀን' : 'Custom Range' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                period === p.id 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Secondary Filters: Custom Date, Barber Dropdown, Payment Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {period === 'custom' && (
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 w-full focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-400 text-xs font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 w-full focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleCustomDateSubmit}
                className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 cursor-pointer"
              >
                Go
              </button>
            </div>
          )}

          {/* Barber Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
              {isAm ? 'በባርበር ለይ' : 'Filter by Barber'}
            </label>
            <select
              value={selectedBarber}
              onChange={e => setSelectedBarber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">{isAm ? 'ሁሉም ባርበሮች' : 'All Barbers'}</option>
              {barbersList?.map(b => (
                <option key={b.id} value={b.id}>
                  Chair #{b.chair_number} - {isAm ? (b.amharic_name || b.name) : b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">
              {isAm ? 'በክፍያ መንገድ ለይ' : 'Filter by Payment'}
            </label>
            <select
              value={selectedPayment}
              onChange={e => setSelectedPayment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">{isAm ? 'ሁሉም የክፍያ መንገዶች' : 'All Payment Methods'}</option>
              <option value="telebirr">Telebirr</option>
              <option value="cash">Direct Cash</option>
              <option value="cbe_birr">CBE Birr</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Executive Financial KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isAm ? 'ጠቅላላ ገቢ' : 'Gross Revenue'}
          </span>
          <p className="text-xl font-black text-amber-400 mt-1">
            {totals.gross_revenue?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">{totals.total_cuts || 0} cuts completed</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isAm ? 'የሱቅ የተጣራ ትርፍ' : 'Shop Net Share'}
          </span>
          <p className="text-xl font-black text-emerald-400 mt-1">
            {totals.net_shop_profit?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">After commissions</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isAm ? 'የባርበሮች ኮሚሽን' : 'Barber Payout'}
          </span>
          <p className="text-xl font-black text-indigo-400 mt-1">
            {totals.total_commissions?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Split payouts</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isAm ? 'ቴሌብር' : 'Telebirr Total'}
          </span>
          <p className="text-xl font-black text-sky-400 mt-1">
            {totals.telebirr_total?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Digital wallet</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isAm ? 'ጥሬ ገንዘብ' : 'Cash in Hand'}
          </span>
          <p className="text-xl font-black text-teal-400 mt-1">
            {totals.cash_total?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Physical register</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {isAm ? 'ጉርሻ (ቲፕ)' : 'Tips Collected'}
          </span>
          <p className="text-xl font-black text-rose-400 mt-1">
            {totals.total_tips?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-0.5 block">Direct client tip</span>
        </div>
      </div>

      {/* 3. Channels Distribution & Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Payment Channels Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-sky-400" />
            {isAm ? 'የክፍያ መንገዶች ክፍፍል' : 'Payment Method Share'}
          </h3>
          <div className="space-y-4">
            {channels.map(ch => (
              <div key={ch.code} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-300">{ch.name}</span>
                  <span className="text-slate-100">
                    {ch.amount.toLocaleString()} ETB <span className="text-slate-500 font-normal">({ch.share}%)</span>
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      ch.code === 'telebirr' ? 'bg-sky-500' :
                      ch.code === 'cash' ? 'bg-teal-500' :
                      ch.code === 'cbe_birr' ? 'bg-purple-500' : 'bg-slate-500'
                    }`}
                    style={{ width: `${Math.min(100, ch.share)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services Performed (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
            <Scissors size={16} className="text-amber-400" />
            {isAm ? 'በጣም የተሰሩ አገልግሎቶች' : 'Top Performed Services'}
          </h3>
          {topServices.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">{isAm ? 'ምንም መረጃ የለም' : 'No service records found.'}</p>
          ) : (
            <div className="space-y-2">
              {topServices.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-200">{s.service_name}</span>
                    <span className="text-slate-500 text-[11px]">({s.quantity} cuts)</span>
                  </div>
                  <div className="text-right font-mono font-bold text-amber-400">
                    {s.total_revenue?.toLocaleString()} ETB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* 4. Barber Comparison & Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-4 flex items-center gap-2">
          <Award size={16} className="text-amber-400" />
          {isAm ? 'የባርበሮች የስራ ንፅፅር እና ማጠቃለያ' : 'Barber Performance Comparison & Payout Balance'}
        </h3>
        {barberLeaderboard.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">{isAm ? 'ምንም መረጃ የለም' : 'No barber records found for this period.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">Barber</th>
                  <th className="p-3 text-center">Chair</th>
                  <th className="p-3 text-center">Total Cuts</th>
                  <th className="p-3 text-right">Volume Generated</th>
                  <th className="p-3 text-right">Commission Rate</th>
                  <th className="p-3 text-right">Commission Earned</th>
                  <th className="p-3 text-right text-amber-400">Tips Earned</th>
                  <th className="p-3 text-right">Shop Payout Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {barberLeaderboard.map((b) => (
                  <tr key={b.id || b.barber_id} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 font-bold text-slate-200">
                      {isAm ? (b.amharic_name || b.barber_amharic_name || b.name || b.barber_name) : (b.name || b.barber_name)}
                    </td>
                    <td className="p-3 text-center text-slate-400 font-mono">#{b.chair_number}</td>
                    <td className="p-3 text-center font-bold text-slate-200">{b.cuts_count || 0}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{(b.volume_generated || b.total_volume || 0)?.toLocaleString()} ETB</td>
                    <td className="p-3 text-right font-mono text-slate-400">{((b.commission_rate || 0.50) * 100).toFixed(0)}%</td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-400">{(b.commission_earned || 0)?.toLocaleString()} ETB</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-400">
                      {(b.tips_earned || 0) > 0 ? `+${(b.tips_earned || 0)?.toLocaleString()} ETB` : '0 ETB'}
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-bold text-emerald-400 font-mono">
                        Pay: {((b.commission_earned || 0) + (b.tips_earned || 0))?.toLocaleString()} ETB
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Detailed Transactions Audit Log */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              {isAm ? 'የተሟላ የግብይቶች ዝርዝር' : 'Filtered Transactions Log'} ({filteredTransactions.length})
            </h3>
            <span className="text-[11px] text-slate-400">
              Every completed cut matching your current filters
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isAm ? 'በቲኬት፣ ደንበኛ ወይም ስልክ ፈልግ...' : 'Search ticket, client, phone...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">{isAm ? 'ምንም ግብይት አልተገኘም' : 'No transactions match the selected criteria.'}</p>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="p-3">Ticket</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Barber</th>
                  <th className="p-3">Services</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right">Tip (Barber)</th>
                  <th className="p-3 text-right">Comm.</th>
                  <th className="p-3 text-right">Shop</th>
                  <th className="p-3 text-right">Date/Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-amber-400">{tx.ticket_number}</td>
                    <td className="p-3">
                      <span className="text-slate-200 font-bold block">{tx.customer_name}</span>
                      {tx.customer_phone && (
                        <span className="text-[10px] text-slate-500">{tx.customer_phone}</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-300">
                      {tx.barber_name || `Chair #${tx.chair_number}`}
                    </td>
                    <td className="p-3 text-slate-400 max-w-[160px] truncate" title={tx.services_rendered}>
                      {tx.services_rendered || 'Haircut'}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        tx.payment_method === 'telebirr' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                        tx.payment_method === 'cash' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-100">
                      {tx.total_amount} ETB
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-400">
                      {tx.tip_amount > 0 ? `+${tx.tip_amount} ETB` : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-indigo-400">
                      {tx.barber_commission} ETB
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400">
                      {tx.shop_share} ETB
                    </td>
                    <td className="p-3 text-right text-[11px] text-slate-500 whitespace-nowrap">
                      {tx.created_at ? tx.created_at.slice(0, 16).replace('T', ' ') : tx.settlement_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Telegram Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Send className="text-blue-400" size={18} />
                Telegram Channel / Chat Brief
              </h3>
              <button 
                onClick={() => setShowTelegramModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-slate-400">
              Copy this pre-formatted message to post directly into your private Telegram owner channel or staff group.
            </p>

            <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {telegramText}
            </pre>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCopyTelegram}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow"
              >
                {copied ? <Check size={14} /> : <Download size={14} />}
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
