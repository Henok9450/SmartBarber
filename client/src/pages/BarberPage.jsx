import React, { useState, useEffect } from 'react';
import { 
  User, Scissors, DollarSign, Clock, CheckCircle2, 
  AlertTriangle, Phone, Star, Shield, ArrowUpRight, ArrowDownRight, KeyRound, Calendar
} from 'lucide-react';
import ChangePinModal from '../components/ChangePinModal';
import { translations } from '../locales/i18n';
import { authFetch } from '../utils/auth';

export default function BarberPage({ lang, currentUser }) {
  const t = translations[lang].barber;

  const isBarberRole = currentUser?.role === 'barber';
  const myBarberId = currentUser?.barber_id;

  const [barbers, setBarbers] = useState([]);
  const [selectedBarberId, setSelectedBarberId] = useState(myBarberId || null);
  const [barberDetail, setBarberDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChangePin, setShowChangePin] = useState(false);
  const [period, setPeriod] = useState('today');

  // Keep selectedBarberId in sync if currentUser changes
  useEffect(() => {
    if (isBarberRole && myBarberId) {
      setSelectedBarberId(myBarberId);
    }
  }, [currentUser]);

  // Load barbers list
  const loadBarbers = async () => {
    try {
      const res = await fetch('/api/barbers');
      const data = await res.json();
      if (data.success) {
        setBarbers(data.data);
        if (isBarberRole && myBarberId) {
          setSelectedBarberId(myBarberId);
        } else if (data.data.length > 0 && !selectedBarberId) {
          setSelectedBarberId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load selected barber detail
  const loadBarberDetail = async (id, filterPeriod = period) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/barbers/${id}?period=${filterPeriod}`);
      const data = await res.json();
      if (data.success) {
        setBarberDetail(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarbers();
  }, []);

  useEffect(() => {
    if (selectedBarberId) {
      loadBarberDetail(selectedBarberId, period);
    }
  }, [selectedBarberId, period]);

  const handleStatusChange = async (status) => {
    try {
      await fetch(`/api/barbers/${selectedBarberId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadBarberDetail(selectedBarberId);
      loadBarbers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarberCall = async (queueId) => {
    try {
      await authFetch(`/api/queue/${queueId}/call`, { method: 'POST' });
      loadBarberDetail(selectedBarberId);
      loadBarbers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBarberComplete = async (queueId) => {
    try {
      await authFetch(`/api/queue/${queueId}/complete`, { method: 'POST' });
      loadBarberDetail(selectedBarberId);
      loadBarbers();
    } catch (err) {
      console.error(err);
    }
  };

  const currentBarber = barberDetail?.barber;
  const summary = barberDetail?.summary;
  const todayTickets = barberDetail?.todayTickets || [];
  const myQueue = barberDetail?.queue || [];

  return (
    <div className="space-y-6">
      {/* Barber Selector Pills - ONLY visible for Shop Owner */}
      {!isBarberRole && (
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t.selectBarber}
            </h2>
            <span className="text-xs text-amber-400 font-semibold">
              {barbers.length} Active Staff
            </span>
          </div>

          {barbers.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs text-slate-400">
                {lang === 'am' ? 'እስካሁን የተመዘገበ ፀጉር ቆራጭ የለም።' : 'No barbers registered yet.'}
              </p>
              <p className="text-[11px] text-amber-400 mt-1">
                {lang === 'am' ? 'ባለቤቱ "የባለቤት አስተዳደር" ገጽ ላይ ገብቶ ባርበሮችን መመዝገብ ይችላል።' : 'Log in as Owner to register barbers and chairs.'}
              </p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {barbers.map(b => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarberId(b.id)}
                  className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 transition whitespace-nowrap cursor-pointer ${
                    selectedBarberId === b.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-sm'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                    {b.chair_number}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-100">
                      {lang === 'am' ? (b.amharic_name || b.name) : b.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {b.cuts_today || 0} cuts • {b.commission_today || 0} ETB
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {currentBarber && summary && (
        <>
          {/* Barber Header & Status Toggles */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20">
                #{currentBarber.chair_number}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-100">
                  {lang === 'am' ? (currentBarber.amharic_name || currentBarber.name) : currentBarber.name}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chair #{currentBarber.chair_number} • Split Rate: {(currentBarber.commission_rate * 100)}% • Phone: {currentBarber.phone}
                </p>
              </div>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => handleStatusChange('active')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  currentBarber.status === 'active' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.active}
              </button>
              <button
                onClick={() => handleStatusChange('busy')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  currentBarber.status === 'busy' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.busy}
              </button>
              <button
                onClick={() => handleStatusChange('break')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  currentBarber.status === 'break' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.break}
              </button>

              <button
                onClick={() => setShowChangePin(true)}
                className="px-2.5 py-1.5 rounded-lg font-semibold text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1 ml-1"
                title="Change My Account PIN"
              >
                <KeyRound size={13} />
                <span className="hidden sm:inline">Change PIN</span>
              </button>
            </div>
          </div>

          {/* Period Filter for Barber */}
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-slate-400 font-bold mr-1 flex items-center gap-1">
                <Calendar size={13} />
                {lang === 'am' ? 'ጊዜ:' : 'Period:'}
              </span>
              {[
                { id: 'today', label: lang === 'am' ? 'ዛሬ' : 'Today' },
                { id: 'yesterday', label: lang === 'am' ? 'ትላንት' : 'Yesterday' },
                { id: 'week', label: lang === 'am' ? 'ያለፉት 7 ቀናት' : 'Last 7 Days' },
                { id: 'month', label: lang === 'am' ? 'የዚህ ወር' : 'This Month' },
                { id: 'all', label: lang === 'am' ? 'ሁሉንም' : 'All Time' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    period === p.id 
                      ? 'bg-amber-500 text-slate-950 shadow' 
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {summary.total_cuts || 0} cuts recorded
            </span>
          </div>

          {/* Earnings & Settlement Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">{t.commissionEarned}</span>
              <p className="text-2xl font-black text-indigo-400 mt-1">
                {summary.total_commission?.toLocaleString()} <span className="text-xs font-normal text-slate-400">ETB</span>
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {summary.total_cuts} services rendered
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">{t.tipsCollected}</span>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {summary.total_tips?.toLocaleString()} <span className="text-xs font-normal text-slate-400">ETB</span>
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Direct client tips
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">{t.totalVolumeGenerated || 'Total Volume Generated'}</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {(summary.total_volume || 0)?.toLocaleString()} <span className="text-xs font-normal text-slate-400">ETB</span>
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Total services value
              </span>
            </div>

            {/* Net Shift Settlement Box */}
            <div className={`p-4 rounded-xl border shadow-lg ${
              summary.net_payout_from_shop >= 0 
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span>{t.netBalance}</span>
                {summary.net_payout_from_shop >= 0 ? (
                  <ArrowDownRight size={18} className="text-emerald-400" />
                ) : (
                  <ArrowUpRight size={18} className="text-amber-400" />
                )}
              </div>
              <p className="text-2xl font-black mt-1">
                {Math.abs(summary.net_payout_from_shop)?.toFixed(1)} <span className="text-xs font-normal opacity-70">ETB</span>
              </p>
              <p className="text-[11px] font-semibold mt-1 opacity-90">
                {summary.net_payout_from_shop >= 0 ? t.shopOwesYou : t.youOweShop}
              </p>
            </div>
          </div>

          {/* Cuts Completed Table & Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Completed Cuts List (8 cols) */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Scissors size={16} className="text-amber-400" />
                  {t.cutsCompleted} ({todayTickets.length})
                </h3>
              </div>

              {todayTickets.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">{t.noCutsYet}</p>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {todayTickets.map(tk => (
                    <div key={tk.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-900">
                            {tk.ticket_number}
                          </span>
                          <span className="font-semibold text-slate-300">
                            {tk.customer_name}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-1">
                          {tk.services_rendered || 'Haircut'} • Paid via <span className="uppercase text-amber-400 font-bold">{tk.payment_method}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-indigo-400 text-sm">
                          +{(tk.barber_commission || 0) + (tk.tip_amount || 0)} ETB
                        </div>
                        <div className="text-[10px] text-slate-400 space-x-1">
                          <span>Comm: {tk.barber_commission} ETB</span>
                          {tk.tip_amount > 0 && (
                            <span className="text-amber-400 font-bold">• Tip: +{tk.tip_amount} ETB</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Assigned Queue (4 cols) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 mb-3 border-b border-slate-800 pb-3 flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" />
                {t.myQueue} ({myQueue.length})
              </h3>

              {myQueue.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  {lang === 'am' ? 'በሰልፍ የተመደበ ደንበኛ የለም' : 'No clients in queue for you.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {myQueue.map(q => (
                    <div key={q.id} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-xs flex justify-between items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-cyan-400">{q.ticket_number}</span>
                          <span className="font-semibold text-slate-200">{q.customer_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{q.service_name || 'Haircut'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {q.status === 'waiting' && (
                          <button
                            onClick={() => handleBarberCall(q.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                            title="Call to chair"
                          >
                            <Scissors size={11} />
                            <span>Call</span>
                          </button>
                        )}

                        {q.status === 'in_chair' && (
                          <button
                            onClick={() => handleBarberComplete(q.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-sm"
                            title="Finish cut & free chair"
                          >
                            <CheckCircle2 size={11} />
                            <span>Finish</span>
                          </button>
                        )}

                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          q.status === 'in_chair' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {q.status === 'in_chair' ? 'In Chair' : 'Waiting'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {/* Change PIN Modal */}
      <ChangePinModal
        isOpen={showChangePin}
        onClose={() => setShowChangePin(false)}
        lang={lang}
      />
    </div>
  );
}
