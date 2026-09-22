import React, { useState, useEffect } from 'react';
import { 
  Send, Copy, Check, Lock, Unlock, RefreshCw, 
  DollarSign, TrendingUp, ShieldCheck, UserCheck, 
  CreditCard, Smartphone, Wallet, AlertCircle, ExternalLink
} from 'lucide-react';
import { authFetch } from '../utils/auth';

export default function DailyReconciliationView({ lang = 'en', currentUser, isModal = false, onClose }) {
  const [settlementData, setSettlementData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [telegramText, setTelegramText] = useState('');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [closingDay, setClosingDay] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const isAmharic = lang === 'am';

  const loadSettlement = async (dateStr) => {
    setLoading(true);
    try {
      const url = dateStr ? `/api/reports/daily?date=${dateStr}` : '/api/reports/daily';
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setSettlementData(data.data);
      }
    } catch (err) {
      console.error('Failed to load daily settlement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlement(selectedDate);
  }, [selectedDate]);

  const handleOpenTelegramReport = async () => {
    try {
      const url = selectedDate ? `/api/reports/telegram?start_date=${selectedDate}&end_date=${selectedDate}` : '/api/reports/telegram';
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setTelegramText(data.text);
        setShowTelegramModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch Telegram report:', err);
    }
  };

  const handleCopyTelegram = () => {
    navigator.clipboard.writeText(telegramText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCloseShift = async () => {
    const confirmMsg = isAmharic 
      ? 'እርግጠኛ ነዎት የቀኑን ሂሳብ መዝጋትና ማጠቃለል ይፈልጋሉ?' 
      : 'Are you sure you want to close the daily register and finalize records?';
    if (!confirm(confirmMsg)) return;

    setClosingDay(true);
    try {
      const res = await authFetch('/api/reports/close', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(isAmharic ? 'የቀኑ ሂሳብ በተሳካ ሁኔታ ተዘግቷል!' : 'Daily register shift closed successfully!');
        loadSettlement(selectedDate);
      } else {
        alert(data.error || 'Failed to close shift');
      }
    } catch (err) {
      console.error(err);
      alert('Error closing shift');
    } finally {
      setClosingDay(false);
    }
  };

  const totals = settlementData?.totals || {};
  const barbers = settlementData?.barbers || [];
  const isClosed = settlementData?.is_closed;

  return (
    <div className={`space-y-6 ${isModal ? 'p-1' : ''}`}>
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
              <span>📋</span>
              <span>{isAmharic ? 'የቀን ማጠቃለያና ሂሳብ ማስታረቂያ' : 'Daily Balance & Register Reconciliation'}</span>
            </h1>
            {isClosed ? (
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5">
                <Lock size={12} />
                <span>{isAmharic ? 'የቀኑ ሂሳብ ተዘግቷል' : 'Shift Closed'}</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{isAmharic ? 'ክፍት ፈረቃ (Active Shift)' : 'Shift Active & Open'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAmharic 
              ? 'የጥሬ ገንዘብ፣ ቴሌብር እና ሲቢኢ ብር ማጠቃለያ፣ ለባርበሮች የሚከፈል ኮሚሽንና ጉርሻ፣ እና ለባለቤቱ የሚላክ ቴሌግራም ሪፖርት'
              : 'Reconcile register cash, Telebirr, CBE Birr, settle barber payouts (commission + tips), and send summary to owner.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadSettlement(selectedDate)}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title={isAmharic ? 'አድስ' : 'Refresh'}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-amber-400' : ''} />
            <span className="hidden sm:inline">{isAmharic ? 'አድስ' : 'Refresh'}</span>
          </button>

          {/* Send Telegram Report to Owner */}
          <button
            onClick={handleOpenTelegramReport}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            <Send size={15} />
            <span>{isAmharic ? '📱 ቴሌግራም ሪፖርት ለባለቤቱ' : '📱 Telegram Report for Owner'}</span>
          </button>

          {/* Close Shift (Available to Cashier & Owner) */}
          {!isClosed && (
            <button
              onClick={handleCloseShift}
              disabled={closingDay}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-200 hover:text-red-300 border border-slate-700 hover:border-red-500/40 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <Lock size={14} className="text-amber-400" />
              <span>{isAmharic ? 'የቀኑን ፈረቃ ዝጋ' : 'Close Day Shift'}</span>
            </button>
          )}

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards: Revenue, Register Cash, Digital Payments & Payouts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Gross Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>{isAmharic ? 'ጠቅላላ ሽያጭ' : 'Gross Revenue'}</span>
            <TrendingUp size={15} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-400">
            {totals.gross_revenue?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">
            {totals.total_cuts || 0} {isAmharic ? 'አገልግሎቶች/ቁረጦች' : 'cuts completed'}
          </span>
        </div>

        {/* Cash in Register Drawer */}
        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-sm bg-gradient-to-b from-slate-900 to-emerald-950/15">
          <div className="flex items-center justify-between text-emerald-300 text-xs mb-1 font-semibold">
            <span>{isAmharic ? 'ጥሬ ገንዘብ (ካሸር እጅ)' : 'Cash in Register'}</span>
            <Wallet size={15} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black text-emerald-300">
            {totals.cash_total?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-emerald-500/80 block mt-1">
            {isAmharic ? 'በካሸር ሳጥን ውስጥ ያለ' : 'Physical drawer balance'}
          </span>
        </div>

        {/* Telebirr Total */}
        <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow-sm bg-gradient-to-b from-slate-900 to-blue-950/15">
          <div className="flex items-center justify-between text-blue-300 text-xs mb-1 font-semibold">
            <span>{isAmharic ? 'ቴሌብር (Telebirr)' : 'Telebirr Total'}</span>
            <Smartphone size={15} className="text-blue-400" />
          </div>
          <p className="text-xl font-black text-blue-300">
            {totals.telebirr_total?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-blue-400/80 block mt-1">
            {isAmharic ? 'በቴሌብር ገቢ የተደረገ' : 'Verified via SMS/merchant'}
          </span>
        </div>

        {/* CBE Birr Total */}
        <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-2xl shadow-sm bg-gradient-to-b from-slate-900 to-purple-950/15">
          <div className="flex items-center justify-between text-purple-300 text-xs mb-1 font-semibold">
            <span>{isAmharic ? 'ሲቢኢ ብር (CBE Birr)' : 'CBE Birr'}</span>
            <Smartphone size={15} className="text-purple-400" />
          </div>
          <p className="text-xl font-black text-purple-300">
            {totals.cbe_total?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-purple-400/80 block mt-1">
            {isAmharic ? 'የባንክ ማስተላለፊያ' : 'Bank transfer total'}
          </span>
        </div>

        {/* Total Barber Payouts (Commission + Tips) */}
        <div className="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl shadow-sm bg-gradient-to-b from-slate-900 to-indigo-950/15">
          <div className="flex items-center justify-between text-indigo-300 text-xs mb-1 font-semibold">
            <span>{isAmharic ? 'ለባርበሮች ክፍያ' : 'Barber Payouts'}</span>
            <DollarSign size={15} className="text-indigo-400" />
          </div>
          <p className="text-xl font-black text-indigo-300">
            {((totals.total_commissions || 0) + (totals.total_tips || 0)).toLocaleString()} <span className="text-[10px] text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-indigo-400/80 block mt-1">
            {totals.total_tips > 0 ? `(${totals.total_commissions?.toLocaleString()} ኮሚሽን + ${totals.total_tips?.toLocaleString()} ጉርሻ)` : 'Commission total'}
          </span>
        </div>

        {/* Net Shop Profit */}
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow-sm bg-gradient-to-b from-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1 font-bold">
            <span>{isAmharic ? 'የሱቁ የተጣራ ገቢ' : 'Shop Net Profit'}</span>
            <ShieldCheck size={15} className="text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">
            {totals.net_shop_profit?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
          </p>
          <span className="text-[10px] text-amber-500/80 block mt-1">
            {isAmharic ? 'ከባርበር ክፍያ በኋላ የቀረ' : 'Net after payouts'}
          </span>
        </div>
      </div>

      {/* Payment Channel Verification Matrix */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <CreditCard size={15} className="text-amber-400" />
          <span>{isAmharic ? 'የክፍያ ቻናሎች ዝርዝር (Register Channel Verification)' : 'Payment Channel Breakdown'}</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                TB
              </span>
              <div>
                <p className="text-xs font-bold text-slate-200">Telebirr</p>
                <p className="text-[10px] text-slate-400">{isAmharic ? 'ዲጂታል ክፍያ' : 'Mobile wallet'}</p>
              </div>
            </div>
            <p className="text-base font-black text-blue-400">
              {totals.telebirr_total?.toLocaleString() || 0} ETB
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                💵
              </span>
              <div>
                <p className="text-xs font-bold text-slate-200">{isAmharic ? 'ጥሬ ገንዘብ' : 'Cash'}</p>
                <p className="text-[10px] text-slate-400">{isAmharic ? 'በካሸር ሳጥን ውስጥ' : 'Direct in drawer'}</p>
              </div>
            </div>
            <p className="text-base font-black text-emerald-400">
              {totals.cash_total?.toLocaleString() || 0} ETB
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                CBE
              </span>
              <div>
                <p className="text-xs font-bold text-slate-200">CBE Birr</p>
                <p className="text-[10px] text-slate-400">{isAmharic ? 'የኢትዮጵያ ንግድ ባንክ' : 'Commercial Bank'}</p>
              </div>
            </div>
            <p className="text-base font-black text-purple-400">
              {totals.cbe_total?.toLocaleString() || 0} ETB
            </p>
          </div>
        </div>
      </div>

      {/* Barber Commission & Tip Settlement Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={16} className="text-amber-400" />
              <span>{isAmharic ? 'የባርበሮች የቀን ሂሳብ ክፍያ ማጠቃለያ' : 'Barber Commission & Settlement Breakdown'}</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isAmharic 
                ? 'ሁሉንም ገንዘብ ካሸሩ ስለሚሰበስብ፡ ለባርበሩ የሚከፈለው = ኮሚሽን + የተሰበሰበው ጉርሻ (Tip)'
                : 'All payments collected at POS: Barber Payout = Commission Earned + Client Tips'}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            {isAmharic ? 'ቀን፡' : 'Date:'} {settlementData?.date || new Date().toISOString().split('T')[0]}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">{isAmharic ? 'ባርበር' : 'Barber'}</th>
                <th className="py-3 px-4 font-semibold text-center">{isAmharic ? 'የቁረጥ ብዛት' : 'Cuts Count'}</th>
                <th className="py-3 px-4 font-semibold text-right">{isAmharic ? 'ያመጣው ሽያጭ' : 'Volume Generated'}</th>
                <th className="py-3 px-4 font-semibold text-right">{isAmharic ? 'የሱቅ ድርሻ' : 'Shop Net'}</th>
                <th className="py-3 px-4 font-semibold text-right text-indigo-400">{isAmharic ? 'የባርበር ኮሚሽን' : 'Commission'}</th>
                <th className="py-3 px-4 font-semibold text-right text-amber-400">{isAmharic ? 'የደንበኛ ጉርሻ (Tip)' : 'Client Tip'}</th>
                <th className="py-3 px-4 font-semibold text-right">{isAmharic ? 'ለባርበሩ የሚከፈል' : 'Pay to Barber'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {barbers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {isAmharic ? 'ዛሬ የተመዘገበ አገልግሎት የለም።' : 'No cuts recorded for today yet.'}
                  </td>
                </tr>
              ) : (
                barbers.map(b => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center font-bold text-[10px]">
                        #{b.chair_number}
                      </span>
                      <span>{isAmharic ? (b.amharic_name || b.name) : b.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-center">{b.cuts_count}</td>
                    <td className="py-3.5 px-4 font-medium text-right">{b.volume_generated?.toLocaleString()} ETB</td>
                    <td className="py-3.5 px-4 font-medium text-right text-slate-400">
                      {((b.volume_generated || 0) - (b.commission_earned || 0)).toLocaleString()} ETB
                    </td>
                    <td className="py-3.5 px-4 font-bold text-right text-indigo-400">
                      {b.commission_earned?.toLocaleString()} ETB
                    </td>
                    <td className="py-3.5 px-4 font-bold text-right text-amber-400">
                      {b.tips_earned > 0 ? `+${b.tips_earned?.toLocaleString()} ETB` : '0 ETB'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-block px-3 py-1.5 rounded-xl font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
                        {isAmharic ? `ክፍያ፡ ${b.total_earned?.toLocaleString()} ብር` : `Pay: ${b.total_earned?.toLocaleString()} ETB`}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Telegram Report Preview & Send Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-blue-400">
                <Send size={20} />
                <h3 className="font-bold text-slate-100 text-base">
                  {isAmharic ? 'የቀን ማጠቃለያ ቴሌግራም ሪፖርት (ለባለቤቱ)' : 'End-of-Day Telegram Report for Owner'}
                </h3>
              </div>
              <button 
                onClick={() => setShowTelegramModal(false)} 
                className="text-slate-400 hover:text-white p-1 text-lg rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              {isAmharic 
                ? 'ይህንን መልዕክት በቀጥታ ኮፒ በማድረግ ወይም ቴሌግራም በመክፈት ለሱቁ ባለቤት መላክ ይችላሉ።'
                : 'Copy this formatted message or open Telegram directly to send the shift financial summary to the owner.'}
            </p>

            <pre className="bg-slate-950 p-4 rounded-2xl font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-[320px] overflow-y-auto border border-slate-800 selection:bg-amber-500/30">
              {telegramText}
            </pre>

            <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
              <span className="text-xs text-emerald-400 font-semibold">
                {copied && (isAmharic ? '✓ ሪፖርቱ ኮፒ ተደርጓል!' : '✓ Message Copied to Clipboard!')}
              </span>

              <div className="flex items-center gap-2">
                {/* One-Click Open Telegram with Pre-Filled Message */}
                <a
                  href={`https://t.me/share/url?url=&text=${encodeURIComponent(telegramText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>{isAmharic ? 'ቴሌግራም ክፈት' : 'Open Telegram'}</span>
                </a>

                {/* Copy Button */}
                <button
                  onClick={handleCopyTelegram}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-600/30"
                >
                  <Copy size={16} />
                  <span>{isAmharic ? 'ኮፒ አድርግ' : 'Copy Message'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
