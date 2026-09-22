import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, Ticket, ArrowRight, CheckCircle2, 
  Sparkles, Phone, User, Scissors, RefreshCw, XCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { translations } from '../locales/i18n';
import { authFetch } from '../utils/auth';

export default function QueuePage({ lang, currentUser }) {
  const t = translations[lang].queue;

  const [queue, setQueue] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [summary, setSummary] = useState({ total_waiting: 0, currently_in_chair: 0, estimated_avg_wait: 15 });
  const [loading, setLoading] = useState(true);

  // Take Ticket Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // Generated Ticket Result Modal
  const [myTicket, setMyTicket] = useState(null);

  const fetchQueueData = async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      if (data.success) {
        setQueue(data.data.queue);
        setBarbers(data.data.barbers);
        setSummary(data.data.summary);
      }

      const srvRes = await fetch('/api/services');
      const srvData = await srvRes.json();
      if (srvData.success) {
        setServices(srvData.data);
        if (srvData.data.length > 0 && !selectedServiceId) {
          setSelectedServiceId(srvData.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const timer = setInterval(fetchQueueData, 10000); // 10s live poll
    return () => clearInterval(timer);
  }, []);

  const handleTakeTicket = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert(lang === 'am' ? 'እባክዎ ስምዎን ያስገቡ' : 'Please enter your name');
      return;
    }

    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        barber_id: selectedBarberId ? parseInt(selectedBarberId) : null,
        service_id: selectedServiceId ? parseInt(selectedServiceId) : null
      };

      const res = await fetch('/api/queue/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setMyTicket(data.data);
        setCustomerName('');
        setCustomerPhone('');
        fetchQueueData();

        // Celebration confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to get ticket');
    }
  };

  const handleCallCustomer = async (id) => {
    try {
      const res = await authFetch(`/api/queue/${id}/call`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchQueueData();
      } else {
        alert(data.error || 'Failed to call customer');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteCut = async (id) => {
    try {
      const res = await authFetch(`/api/queue/${id}/complete`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchQueueData();
      } else {
        alert(data.error || 'Failed to complete ticket');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelTicket = async (id) => {
    if (confirm(lang === 'am' ? 'ይህንን የሰልፍ ቁጥር መሰረዝ ይፈልጋሉ?' : 'Cancel this ticket?')) {
      try {
        const res = await authFetch(`/api/queue/${id}/cancel`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          fetchQueueData();
        } else {
          alert(data.error || 'Failed to cancel ticket');
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const inChairItems = queue.filter(q => q.status === 'in_chair');
  const waitingItems = queue.filter(q => q.status === 'waiting');

  return (
    <div className="space-y-6">
      {/* Header / Intro */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2">
              <Sparkles size={14} />
              <span>Telegram Mini App & Counter Display Ready</span>
            </div>
            <h1 className="text-2xl font-black text-slate-100">{t.title}</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">{t.subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60 text-center">
              <span className="text-xs text-slate-400 block">{t.currentInChair}</span>
              <span className="text-xl font-black text-amber-400">{summary.currently_in_chair}</span>
            </div>
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60 text-center">
              <span className="text-xs text-slate-400 block">{t.waitingLine}</span>
              <span className="text-xl font-black text-emerald-400">{summary.total_waiting}</span>
            </div>
            <div className="bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60 text-center">
              <span className="text-xs text-slate-400 block">{t.estWait}</span>
              <span className="text-xl font-black text-cyan-400">~{summary.estimated_avg_wait} <span className="text-xs font-normal">min</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Take Ticket Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Ticket size={22} />
              <h2 className="text-lg font-bold text-slate-100">{t.takeTicket}</h2>
            </div>

            <form onSubmit={handleTakeTicket} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">{t.yourName} *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. Dawit Tadesse"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">{t.phone}</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="0911 234 567"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">{t.preferredBarber}</label>
                <select
                  value={selectedBarberId}
                  onChange={e => setSelectedBarberId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="">{t.anyAvailable}</option>
                  {barbers.map(b => (
                    <option key={b.id} value={b.id}>
                      {lang === 'am' ? b.amharic_name : b.name} (Chair {b.chair_number} • {b.waiting_count} waiting)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1 font-medium">{t.selectService}</label>
                <select
                  value={selectedServiceId}
                  onChange={e => setSelectedServiceId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {lang === 'am' ? s.amharic_name : s.name} - {s.price} ETB ({s.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer mt-2"
              >
                <span>{t.joinQueueBtn}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          </div>

          {/* Barber Chair Status Cards */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {lang === 'am' ? 'የወንበሮች የቀጥታ ሁኔታ' : 'Live Chairs Status'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {barbers.map(b => (
                <div key={b.id} className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-200">
                      {lang === 'am' ? b.amharic_name : b.name}
                    </span>
                    <p className="text-[11px] text-slate-400">Chair {b.chair_number}</p>
                  </div>
                  <div className="text-right">
                    {b.current_ticket ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                        {b.current_ticket}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        Free
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Live Waiting Board (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Section: Currently In Chair */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Scissors size={16} />
                {t.currentInChair} ({inChairItems.length})
              </h3>
            </div>

            {inChairItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                {lang === 'am' ? 'በአሁኑ ሰዓት በወንበር ላይ ያለ ደንበኛ የለም።' : 'No customers currently in chair.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inChairItems.map(item => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black font-mono text-xs">
                          {item.ticket_number}
                        </span>
                        <span className="font-bold text-slate-100 text-sm truncate max-w-[140px]">
                          {item.customer_name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-semibold flex items-center gap-1">
                          <Scissors size={11} className="rotate-45" />
                          <span>In Chair</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Barber: <span className="text-slate-200 font-medium">{lang === 'am' ? item.barber_amharic_name : item.barber_name}</span>
                        {item.service_name && <span className="text-slate-500"> • {item.service_name}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleCompleteCut(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                        title={lang === 'am' ? 'ቁረጡ ተጠናቋል - ወንበር ልቀቅ' : 'Mark cutting finished & free chair'}
                      >
                        <CheckCircle2 size={14} />
                        <span>{lang === 'am' ? 'ተጠናቀቀ (Finish Cut)' : 'Finish Cut'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Waiting Line */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Users size={16} />
                {t.waitingLine} ({waitingItems.length})
              </h3>
              <span className="text-xs text-slate-500">Auto-refreshing live</span>
            </div>

            {waitingItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">{t.emptyQueue}</p>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {waitingItems.map((item, idx) => (
                  <div 
                    key={item.id} 
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between hover:bg-slate-800/70 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-700">
                            {item.ticket_number}
                          </span>
                          <span className="font-semibold text-slate-200 text-sm">
                            {item.customer_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.service_name || 'Standard Cut'} • {item.barber_name ? (lang === 'am' ? item.barber_amharic_name : item.barber_name) : (lang === 'am' ? 'ማንኛውም ክፍት ባርበር' : 'First Available')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCallCustomer(item.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title={t.callToChair}
                      >
                        <Scissors size={14} />
                        <span>{t.callToChair}</span>
                      </button>
                      <button
                        onClick={() => handleCancelTicket(item.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
                        title={t.cancel}
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Success Modal for the Customer */}
      {myTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Ticket size={32} />
            </div>

            <h3 className="text-lg font-bold text-slate-100">{t.ticketSuccess}</h3>
            <p className="text-xs text-slate-400 mt-1">{myTicket.ticket?.customer_name}</p>

            <div className="my-6 p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs text-slate-500 block uppercase tracking-widest">{t.yourNumber}</span>
              <span className="text-4xl font-black font-mono text-amber-400 block mt-1 tracking-wider">
                {myTicket.ticket?.ticket_number}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-6">
              <div className="p-2.5 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block">{t.peopleAhead}</span>
                <span className="text-lg font-black text-emerald-400">{myTicket.queue_position - 1}</span>
              </div>
              <div className="p-2.5 bg-slate-800/60 rounded-xl">
                <span className="text-slate-400 block">{t.estWait}</span>
                <span className="text-lg font-black text-cyan-400">{myTicket.estimated_wait_mins} {t.minutes}</span>
              </div>
            </div>

            <button
              onClick={() => setMyTicket(null)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
            >
              OK, Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
