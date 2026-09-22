import React, { useState, useEffect } from 'react';
import { 
  Scissors, DollarSign, User, Phone, Check, RefreshCw, 
  Receipt, Sparkles, AlertCircle, ShoppingBag, ShieldCheck,
  TrendingUp, Clock, FileText, Send
} from 'lucide-react';
import ThermalReceiptModal from '../components/ThermalReceiptModal';
import DailyReconciliationView from '../components/DailyReconciliationView';
import { translations } from '../locales/i18n';
import { authFetch } from '../utils/auth';

export default function POSPage({ lang, currentUser }) {
  const t = translations[lang].pos;
  const isOwner = currentUser?.role === 'owner';

  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [settings, setSettings] = useState({});
  const [todayStats, setTodayStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [recentFilter, setRecentFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('telebirr');
  const [telebirrTxId, setTelebirrTxId] = useState('');
  const [tipAmount, setTipAmount] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');

  // Modal State
  const [completedTicket, setCompletedTicket] = useState(null);
  const [completedItems, setCompletedItems] = useState([]);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const res = await authFetch('/api/pos/init');
      const data = await res.json();
      if (data.success) {
        setBarbers(data.data.barbers);
        setServices(data.data.services);
        setSettings(data.data.settings);
        setTodayStats(data.data.todayStats);
        if (data.data.barbers.length > 0 && !selectedBarber) {
          setSelectedBarber(data.data.barbers[0]);
        }
      }

      const recentRes = await fetch('/api/pos/recent?limit=8');
      const recentData = await recentRes.json();
      if (recentData.success) {
        setRecentSales(recentData.data);
      }
    } catch (err) {
      console.error('Failed to load POS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleService = (srv) => {
    const exists = selectedServices.find(s => s.id === srv.id);
    if (exists) {
      setSelectedServices(selectedServices.filter(s => s.id !== srv.id));
    } else {
      setSelectedServices([...selectedServices, srv]);
    }
  };

  // Calculations
  const subtotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
  const barberRate = selectedBarber ? selectedBarber.commission_rate : 0.5;
  const barberCommTotal = selectedServices.reduce((acc, s) => {
    const rate = s.commission_rate !== undefined ? s.commission_rate : barberRate;
    return acc + (s.price * rate);
  }, 0);
  const shopNetTotal = subtotal - barberCommTotal;
  const grandTotal = subtotal;

  const handleCheckout = async () => {
    if (!selectedBarber) {
      alert(lang === 'am' ? 'እባክዎ ፀጉር ቆራጭ ይምረጡ' : 'Please select a barber');
      return;
    }
    if (selectedServices.length === 0) {
      alert(lang === 'am' ? 'እባክዎ ቢያንስ አንድ አገልግሎት ይምረጡ' : 'Please select at least one service');
      return;
    }

    try {
      const payload = {
        barber_id: selectedBarber.id,
        customer_name: customerName.trim() || (lang === 'am' ? 'መደበኛ ደንበኛ' : 'Walk-in Customer'),
        customer_phone: customerPhone.trim(),
        payment_method: paymentMethod,
        telebirr_tx_id: telebirrTxId.trim(),
        tip_amount: parseFloat(tipAmount) || 0,
        items: selectedServices.map(s => ({
          service_id: s.id,
          name: lang === 'am' ? s.amharic_name : s.name,
          price: s.price,
          commission_rate: s.commission_rate
        }))
      };

      const res = await authFetch('/api/pos/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();

      if (resData.success) {
        setCompletedTicket(resData.data.ticket);
        setCompletedItems(resData.data.items);

        // Reset form
        setSelectedServices([]);
        setCustomerName('');
        setCustomerPhone('');
        setTelebirrTxId('');
        setTipAmount(0);

        // Refresh stats
        fetchData();
      } else {
        alert('Error: ' + resData.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to complete sale');
    }
  };

  const categories = ['all', 'haircut', 'beard', 'combo', 'facial', 'treatment', 'product'];

  const filteredServices = activeCategory === 'all' 
    ? services 
    : services.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Top Header Bar with Shift Reconciliation & Telegram Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
            <Scissors className="text-amber-400 rotate-45" size={20} />
            <span>{t.title}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'am' 
              ? 'የፀጉር ቤት ክፍያ መመዝገቢያ፣ የቀን ሂሳብ ማስታረቂያ እና ለባለቤቱ ቴሌግራም ሪፖርት መላኪያ' 
              : 'Register sales, verify payment channels, settle barber tips, and send daily summary to owner.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowReconciliationModal(true)}
            className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
            title="Open Daily Register Reconciliation & Telegram Report"
          >
            <FileText size={15} />
            <span>{lang === 'am' ? '📋 የቀን ማጠቃለያና ቴሌግራም' : '📋 Daily Balance & Telegram Report'}</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={lang === 'am' ? 'አድስ' : 'Refresh'}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-amber-400' : ''} />
          </button>
        </div>
      </div>

      {/* Top Banner KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.grossRev}</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {todayStats?.gross_revenue?.toLocaleString() || 0} <span className="text-xs text-slate-400 font-normal">ETB</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {todayStats?.telebirr_total || 0} ETB via Telebirr
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.cutsCount}</span>
            <Scissors size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {todayStats?.total_tickets || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Completed shifts
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.shopNet}</span>
            <ShieldCheck size={16} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {todayStats?.net_shop?.toLocaleString() || 0} <span className="text-xs text-slate-400 font-normal">ETB</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            After barber splits
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{t.barberPayouts}</span>
            <DollarSign size={16} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-400 mt-1">
            {todayStats?.total_commissions?.toLocaleString() || 0} <span className="text-xs text-slate-400 font-normal">ETB</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total commissions
          </div>
        </div>
      </div>

      {/* Main POS Workspace (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Barber Selection & Service Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Step 1: Barbers Row */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Scissors size={16} className="text-amber-500" />
                {t.step1}
              </h2>
              <span className="text-xs text-slate-500">
                {barbers.length} {lang === 'am' ? 'ቆራጮች' : 'Barbers Active'}
              </span>
            </div>

            {barbers.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">
                  {lang === 'am' ? 'እስካሁን የተመዘገበ ፀጉር ቆራጭ የለም።' : 'No barbers registered yet.'}
                </p>
                <p className="text-[11px] text-amber-400 mt-1">
                  {lang === 'am' ? 'በ"የባለቤት አስተዳደር" ገጽ ላይ አዲስ ባርበር መመዝገብ ይችላሉ።' : 'Go to "Owner Management" to create and assign barbers.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {barbers.map(b => {
                  const isSelected = selectedBarber?.id === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBarber(b)}
                      className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10' 
                          : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                          {t.chair} {b.chair_number}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          b.status === 'busy' ? 'bg-amber-400' :
                          b.status === 'break' ? 'bg-red-400' : 'bg-emerald-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-100 truncate">
                          {lang === 'am' ? (b.amharic_name || b.name) : b.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {b.cuts_today || 0} {t.cutsToday}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Service Catalog */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShoppingBag size={16} className="text-amber-500" />
                {t.step2}
              </h2>
              <button
                onClick={fetchData}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 cursor-pointer bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700"
                title="Refresh services and prices"
              >
                <RefreshCw size={12} />
                <span>Sync Prices</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition cursor-pointer ${
                    activeCategory === cat 
                      ? 'bg-amber-500 text-slate-950 font-bold' 
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'all' ? (lang === 'am' ? 'ሁሉም' : 'All') : cat}
                </button>
              ))}
            </div>

            {/* Service Items Grid */}
            {services.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">
                  {lang === 'am' ? 'እስካሁን የተመዘገበ አገልግሎት የለም።' : 'No services created yet.'}
                </p>
                <p className="text-[11px] text-amber-400 mt-1">
                  {lang === 'am' ? 'በ"የባለቤት አስተዳደር" ገጽ ላይ አገልግሎቶችንና ዋጋዎችን መመዝገብ ይችላሉ።' : 'Go to "Owner Management" to add your services & prices.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredServices.map(srv => {
                const isSelected = selectedServices.some(s => s.id === srv.id);
                return (
                  <button
                    key={srv.id}
                    onClick={() => toggleService(srv)}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-100 shadow-sm'
                        : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="pr-2">
                      <p className="font-semibold text-sm text-slate-100">
                        {lang === 'am' ? srv.amharic_name : srv.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {srv.duration_minutes > 0 ? `${srv.duration_minutes} min` : 'Retail'} • Split {srv.commission_rate * 100}%
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="text-base font-black text-amber-400">
                        {srv.price} <span className="text-xs text-slate-400 font-normal">ETB</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        </div>

        {/* Right Side: Cart, Customer, Settlement & Checkout (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-100">{t.step3}</h3>
                  <p className="text-xs text-slate-400">
                    Barber: <span className="font-semibold text-amber-400">
                      {selectedBarber ? (lang === 'am' ? selectedBarber.amharic_name : selectedBarber.name) : 'None'}
                    </span>
                  </p>
                </div>
                {selectedServices.length > 0 && (
                  <button
                    onClick={() => setSelectedServices([])}
                    className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
                  >
                    {t.clear}
                  </button>
                )}
              </div>

              {/* Customer Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.customerName}</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder={t.walkIn}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.customerPhone}</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="0911..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Selected Services List */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-1.5">
                {selectedServices.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">
                    {lang === 'am' ? 'አገልግሎት አልተመረጠም' : 'No service selected yet.'}
                  </p>
                ) : (
                  selectedServices.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="text-slate-200 truncate">{lang === 'am' ? item.amharic_name : item.name}</span>
                      <span className="font-bold text-amber-400 ml-2">{item.price} ETB</span>
                    </div>
                  ))
                )}
              </div>

              {/* Commission Breakdown Bar */}
              {selectedServices.length > 0 && (
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400">{t.barberShare}:</span>
                    <p className="font-bold text-indigo-400 text-sm">{barberCommTotal.toFixed(1)} ETB</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">{t.shopShare}:</span>
                    <p className="font-bold text-emerald-400 text-sm">{shopNetTotal.toFixed(1)} ETB</p>
                  </div>
                </div>
              )}

              {/* Payment Methods (Telebirr Priority) */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5">{t.paymentMethod}</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => setPaymentMethod('telebirr')}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'telebirr'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>Telebirr</span>
                    <span className="text-[10px] opacity-80">ቴሌብር</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>Cash</span>
                    <span className="text-[10px] opacity-80">ጥሬ ገንዘብ</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('cbe_birr')}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'cbe_birr'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>CBE Birr</span>
                    <span className="text-[10px] opacity-80">ሲቢኢ</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>Card / POS</span>
                    <span className="text-[10px] opacity-80">ባንክ</span>
                  </button>
                </div>
              </div>

              {/* Telebirr / CBE Transaction ID Input */}
              {(paymentMethod === 'telebirr' || paymentMethod === 'cbe_birr') && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {paymentMethod === 'telebirr' ? t.telebirrTxId : 'CBE Transaction ID'}
                  </label>
                  <input
                    type="text"
                    value={telebirrTxId}
                    onChange={e => setTelebirrTxId(e.target.value)}
                    placeholder={t.enterTxPlaceholder}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Tip Input for Selected Barber */}
              <div className="space-y-1.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>{t.tip || 'Barber Tip'}:</span>
                    {selectedBarber && (
                      <span className="text-amber-400 font-bold">
                        ({lang === 'am' ? (selectedBarber.amharic_name || selectedBarber.name) : selectedBarber.name})
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1">
                    {[0, 50, 100, 200].map(tipVal => (
                      <button
                        key={tipVal}
                        type="button"
                        onClick={() => setTipAmount(tipVal)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                          parseFloat(tipAmount) === tipVal 
                            ? 'bg-amber-500 text-slate-950 shadow' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        +{tipVal}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">
                    {lang === 'am' ? 'ሌላ የቲፕ መጠን (ብር):' : 'Custom Tip (ETB):'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={tipAmount || ''}
                    onChange={e => setTipAmount(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  {parseFloat(tipAmount) > 0 && (
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      ✓ {tipAmount} ETB 100% to {selectedBarber?.name || 'Barber'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Total & Checkout Button */}
            <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400 font-medium">{t.total}:</span>
                <span className="text-3xl font-black text-amber-400">
                  {grandTotal + parseFloat(tipAmount || 0)} <span className="text-sm font-normal text-slate-400">ETB</span>
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={selectedServices.length === 0}
                className={`w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  selectedServices.length === 0 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                <Receipt size={18} />
                {t.completeAndPrint}
              </button>
            </div>
          </div>

          {/* Recent Sales List */}
          <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.recentSales}
              </h4>
              <div className="flex gap-1 text-[10px]">
                {['all', 'telebirr', 'cash', 'cbe_birr'].map(m => (
                  <button
                    key={m}
                    onClick={() => setRecentFilter(m)}
                    className={`px-2 py-0.5 rounded capitalize font-semibold transition cursor-pointer ${
                      recentFilter === m ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m === 'all' ? (lang === 'am' ? 'ሁሉም' : 'All') : m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {recentSales.filter(s => recentFilter === 'all' || s.payment_method === recentFilter).length === 0 ? (
                <p className="text-xs text-slate-500 py-2">{t.noSales}</p>
              ) : (
                recentSales
                  .filter(s => recentFilter === 'all' || s.payment_method === recentFilter)
                  .map(sale => (
                    <div key={sale.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-800/40 border border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-200">{sale.ticket_number}</span>
                        <span className="text-slate-400 ml-2">({sale.barber_name})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {sale.payment_method}
                        </span>
                        <span className="font-bold text-amber-400">{sale.total_amount} ETB</span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Modal (Triggered after checkout) */}
      {completedTicket && (
        <ThermalReceiptModal
          ticket={completedTicket}
          items={completedItems}
          settings={settings}
          lang={lang}
          onClose={() => setCompletedTicket(null)}
        />
      )}
      {/* Daily Reconciliation & Telegram Report Modal */}
      {showReconciliationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <DailyReconciliationView 
              lang={lang} 
              currentUser={currentUser} 
              isModal={true} 
              onClose={() => setShowReconciliationModal(false)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
