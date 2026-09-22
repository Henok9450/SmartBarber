import React, { useState, useEffect } from 'react';
import { 
  Building2, TrendingUp, DollarSign, ShieldCheck, Lock, Unlock,
  Send, Copy, Check, QrCode, Settings, FileText, AlertCircle,
  Plus, Edit3, Trash2, Scissors, UserCheck, Calendar, User, Phone, KeyRound,
  Upload, Image, MapPin, Store, Sparkles, CheckCircle2, RefreshCw
} from 'lucide-react';
import { translations } from '../locales/i18n';
import { authFetch } from '../utils/auth';
import ChangePinModal from '../components/ChangePinModal';
import OwnerReportsView from '../components/OwnerReportsView';

export default function AdminPage({ lang }) {
  const t = translations[lang].owner;

  // PIN security lock
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Sub-tabs in Admin
  const [adminTab, setAdminTab] = useState('settlement'); // 'settlement', 'reports', 'barbers', 'services', 'branding'

  // Data State
  const [settlementData, setSettlementData] = useState(null);
  const [barbersList, setBarbersList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [telegramText, setTelegramText] = useState('');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({});
  const [closingDay, setClosingDay] = useState(false);

  // Branding & Profile State
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [brandingForm, setBrandingForm] = useState({
    shop_name: 'SmartBarber',
    shop_name_amharic: 'ስማርት ባርበር',
    branch_name: 'Bole Executive Branch',
    branch_name_amharic: 'ቦሌ ኤክስኪዩቲቭ ቅርንጫፍ',
    address: 'Cameroon St, Next to Edna Mall, Bole, Addis Ababa',
    address_amharic: 'ካሜሩን ጎዳና፣ ኤድና ሞል አጠገብ፣ ቦሌ፣ አዲስ አበባ',
    phone: '+251 911 244 556',
    logo_url: '',
    logo_icon: 'scissors'
  });

  // Barber Modal State
  const [showBarberModal, setShowBarberModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);
  const [barberForm, setBarberForm] = useState({
    name: '',
    amharic_name: '',
    phone: '',
    chair_number: 1,
    commission_rate: 0.50,
    status: 'active'
  });

  // Service Modal State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [quickPriceEditId, setQuickPriceEditId] = useState(null);
  const [quickPriceVal, setQuickPriceVal] = useState('');
  const [quickPriceSuccessId, setQuickPriceSuccessId] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    amharic_name: '',
    category: 'haircut',
    price: 250,
    duration_minutes: 25,
    commission_rate: 0.50
  });

  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [targetPinUser, setTargetPinUser] = useState(null);
  const [staffUsers, setStaffUsers] = useState([]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === settings.owner_pin) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const loadAllData = async () => {
    try {
      const [settleRes, barbersRes, servicesRes, setRes, usersRes] = await Promise.all([
        authFetch('/api/reports/daily'),
        authFetch('/api/barbers/admin'),
        authFetch('/api/services/admin'),
        authFetch('/api/settings'),
        authFetch('/api/auth/users')
      ]);

      const [settleD, barbersD, servicesD, setD, usersD] = await Promise.all([
        settleRes.json(),
        barbersRes.json(),
        servicesRes.json(),
        setRes.json(),
        usersRes.json()
      ]);

      if (settleD.success) setSettlementData(settleD.data);
      if (barbersD.success) setBarbersList(barbersD.data);
      if (servicesD.success) setServicesList(servicesD.data);
      if (setD.success && setD.data) {
        setSettings(setD.data);
        setBrandingForm(prev => ({
          ...prev,
          shop_name: setD.data.shop_name || 'SmartBarber',
          shop_name_amharic: setD.data.shop_name_amharic || 'ስማርት ባርበር',
          branch_name: setD.data.branch_name || 'Bole Executive Branch',
          branch_name_amharic: setD.data.branch_name_amharic || 'ቦሌ ኤክስኪዩቲቭ ቅርንጫፍ',
          address: setD.data.address || 'Cameroon St, Next to Edna Mall, Bole, Addis Ababa',
          address_amharic: setD.data.address_amharic || 'ካሜሩን ጎዳና፣ ኤድና ሞል አጠገብ፣ ቦሌ፣ አዲስ አበባ',
          phone: setD.data.phone || '+251 911 244 556',
          logo_url: setD.data.logo_url || '',
          logo_icon: setD.data.logo_icon || 'scissors'
        }));
      }
      if (usersD.success) setStaffUsers(usersD.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'am' ? 'የሎጎው መጠን ከ 2MB መብለጥ የለበትም' : 'Logo file size must be less than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setBrandingForm(prev => ({
        ...prev,
        logo_url: uploadEvent.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandingForm)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        window.dispatchEvent(new Event('settings-change'));
        loadAllData();
      } else {
        alert(data.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving shop profile');
    } finally {
      setSavingSettings(false);
    }
  };

  // Barber Actions
  const openAddBarber = () => {
    setEditingBarber(null);
    setBarberForm({
      name: '',
      amharic_name: '',
      phone: '',
      chair_number: barbersList.length + 1,
      commission_rate: 0.50,
      status: 'active'
    });
    setShowBarberModal(true);
  };

  const openEditBarber = (b) => {
    setEditingBarber(b);
    setBarberForm({
      name: b.name,
      amharic_name: b.amharic_name || '',
      phone: b.phone || '',
      chair_number: b.chair_number,
      commission_rate: b.commission_rate,
      status: b.status
    });
    setShowBarberModal(true);
  };

  const handleSaveBarber = async (e) => {
    e.preventDefault();
    try {
      const url = editingBarber ? `/api/barbers/${editingBarber.id}` : '/api/barbers';
      const method = editingBarber ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(barberForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowBarberModal(false);
        loadAllData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBarberActive = async (b) => {
    try {
      await authFetch(`/api/barbers/${b.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !b.is_active })
      });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Service Actions
  const openAddService = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      amharic_name: '',
      category: 'haircut',
      price: 250,
      duration_minutes: 25,
      commission_rate: 0.50
    });
    setShowServiceModal(true);
  };

  const openEditService = (s) => {
    setEditingService(s);
    setServiceForm({
      name: s.name,
      amharic_name: s.amharic_name || '',
      category: s.category || 'haircut',
      price: s.price,
      duration_minutes: s.duration_minutes,
      commission_rate: s.commission_rate
    });
    setShowServiceModal(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      const url = editingService ? `/api/services/${editingService.id}` : '/api/services';
      const method = editingService ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowServiceModal(false);
        loadAllData();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleServiceActive = async (s) => {
    try {
      await authFetch(`/api/services/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !s.is_active })
      });
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const startQuickPriceEdit = (s) => {
    setQuickPriceEditId(s.id);
    setQuickPriceVal(String(s.price));
  };

  const handleQuickPriceSave = async (serviceId) => {
    const val = parseFloat(quickPriceVal);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid price');
      return;
    }
    try {
      const res = await authFetch(`/api/services/${serviceId}/price`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: val })
      });
      const data = await res.json();
      if (data.success) {
        setQuickPriceSuccessId(serviceId);
        setTimeout(() => setQuickPriceSuccessId(null), 2000);
        setQuickPriceEditId(null);
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteService = async (service) => {
    if (!confirm(`Are you sure you want to remove/deactivate "${service.name}"?`)) return;
    try {
      const res = await authFetch(`/api/services/${service.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBulkAdjust = async (amount) => {
    const actionLabel = amount > 0 ? `+${amount} ETB` : `${amount} ETB`;
    if (!confirm(`Adjust all active services by ${actionLabel}?`)) return;
    try {
      const promises = servicesList.map(s => {
        const newPrice = Math.max(10, s.price + amount);
        return authFetch(`/api/services/${s.id}/price`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: newPrice })
        });
      });
      await Promise.all(promises);
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Telegram Report Actions
  const handleOpenTelegramReport = async () => {
    try {
      const res = await authFetch('/api/reports/telegram');
      const data = await res.json();
      if (data.success) {
        setTelegramText(data.text);
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

  const handleCloseShift = async () => {
    if (!confirm(lang === 'am' ? 'እርግጠኛ ነዎት የቀኑን ሂሳብ መዝጋትና መቆለፍ ይፈልጋሉ?' : 'Close shift and lock records for today?')) return;
    setClosingDay(true);
    try {
      const res = await authFetch('/api/reports/close', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(lang === 'am' ? 'የቀኑ ሂሳብ ተዘግቷል!' : 'Day shift closed successfully!');
        loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClosingDay(false);
    }
  };

  // If locked, show PIN lock screen
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock size={30} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-100">{t.title}</h2>
            <p className="text-xs text-slate-400 mt-1">{t.pinPrompt}</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                placeholder={t.pinPlaceholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-xl tracking-widest text-slate-100 focus:outline-none focus:border-amber-500"
              />
              {pinError && (
                <p className="text-xs text-red-400 mt-2 font-medium">Incorrect PIN (Hint: default is 1234)</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock size={16} />
              <span>{t.unlockBtn}</span>
            </button>
          </form>

          <p className="text-[11px] text-slate-500">
            Protects barber commission splits, pricing, and revenue records from unauthorized modification.
          </p>
        </div>
      </div>
    );
  }

  const totals = settlementData?.totals || {};
  const barbers = settlementData?.barbers || [];

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Sub-Nav */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-100">{t.title}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              Owner Unlocked
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">{t.subtitle}</p>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setAdminTab('settlement')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              adminTab === 'settlement' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.tabSettlement}
          </button>
          <button
            onClick={() => setAdminTab('reports')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              adminTab === 'reports' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.tabReports || 'Analytics & Reports'}
          </button>
          <button
            onClick={() => setAdminTab('barbers')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              adminTab === 'barbers' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.tabBarbers} ({barbersList.length})
          </button>
          <button
            onClick={() => setAdminTab('services')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              adminTab === 'services' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.tabServices} ({servicesList.length})
          </button>
          <button
            onClick={() => setAdminTab('branding')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
              adminTab === 'branding' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 size={13} />
            <span>{t.tabBranding || (lang === 'am' ? 'የሱቅ መረጃና ብራንዲንግ' : 'Shop Profile & Branding')}</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SETTLEMENT */}
      {adminTab === 'settlement' && (
        <div className="space-y-6">
          {/* Quick Action Strip */}
          <div className="flex justify-end gap-2">
            <button
              onClick={handleOpenTelegramReport}
              className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
            >
              <Send size={15} />
              <span>{t.telegramReportBtn}</span>
            </button>

            {!settlementData?.is_closed && (
              <button
                onClick={handleCloseShift}
                disabled={closingDay}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Lock size={15} className="text-amber-400" />
                <span>{t.closeDayBtn}</span>
              </button>
            )}
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 block">{t.grossRevenue}</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {totals.gross_revenue?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 block">{t.telebirrTotal}</span>
              <p className="text-xl font-black text-blue-400 mt-1">
                {totals.telebirr_total?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 block">{t.cashInDrawer}</span>
              <p className="text-xl font-black text-emerald-400 mt-1">
                {totals.cash_total?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 block">{t.cbeTotal}</span>
              <p className="text-xl font-black text-purple-400 mt-1">
                {totals.cbe_total?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <span className="text-[11px] text-slate-400 block">{t.totalCommissions}</span>
              <p className="text-xl font-black text-indigo-400 mt-1">
                {totals.total_commissions?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl bg-gradient-to-b from-slate-900 to-amber-950/20 border-amber-500/20">
              <span className="text-[11px] text-amber-400 block font-bold">{t.netShopProfit}</span>
              <p className="text-xl font-black text-amber-400 mt-1">
                {totals.net_shop_profit?.toLocaleString() || 0} <span className="text-[10px] text-slate-400">ETB</span>
              </p>
            </div>
          </div>

          {/* Barber Settlement Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-slate-100 text-sm uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={16} className="text-amber-400" />
                {t.barberSettlementTable}
              </h2>
              <span className="text-xs text-slate-400">Date: {settlementData?.date}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">{t.barberCol}</th>
                    <th className="py-3 px-4 font-semibold">{t.cutsCol}</th>
                    <th className="py-3 px-4 font-semibold">{t.volumeCol}</th>
                    <th className="py-3 px-4 font-semibold">{t.commissionCol}</th>
                    <th className="py-3 px-4 font-semibold text-amber-400">{t.tipCol || 'Client Tip'}</th>
                    <th className="py-3 px-4 font-semibold text-right">{t.actionCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {barbers.map(b => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                          {b.chair_number}
                        </span>
                        <span>{lang === 'am' ? (b.amharic_name || b.name) : b.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium">{b.cuts_count}</td>
                      <td className="py-3.5 px-4 font-medium">{b.volume_generated?.toLocaleString()} ETB</td>
                      <td className="py-3.5 px-4 font-bold text-indigo-400">{b.commission_earned?.toLocaleString()} ETB</td>
                      <td className="py-3.5 px-4 font-bold text-amber-400">
                        {b.tips_earned > 0 ? `+${b.tips_earned?.toLocaleString()} ETB` : '0 ETB'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-block px-3 py-1 rounded-lg font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {lang === 'am' ? `ክፍያ፡ ${b.total_earned?.toLocaleString()} ብር` : `Pay Barber: ${b.total_earned?.toLocaleString()} ETB`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: ANALYTICS & REPORTS */}
      {adminTab === 'reports' && (
        <OwnerReportsView lang={lang} barbersList={barbersList} />
      )}

      {/* SUB-TAB 2: DYNAMIC BARBERS MANAGEMENT (CREATE, MODIFY, ENTERTAIN) */}
      {adminTab === 'barbers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Add new staff, change commission splits, assign chairs, or toggle status.
            </p>
            <button
              onClick={openAddBarber}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Plus size={16} />
              <span>{t.addBarber}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbersList.map(b => (
              <div 
                key={b.id} 
                className={`p-5 rounded-2xl border transition relative space-y-3 ${
                  b.is_active ? 'bg-slate-900 border-slate-800' : 'bg-slate-950/60 border-red-950/40 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-black text-xl border border-slate-700">
                      #{b.chair_number}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-base">
                        {b.name}
                      </h3>
                      <p className="text-xs text-amber-400/80 font-medium">
                        {b.amharic_name || '—'}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    b.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block">Commission Split</span>
                    <span className="font-bold text-indigo-400 text-sm">{(b.commission_rate * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Phone</span>
                    <span className="text-slate-300 font-mono">{b.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cuts Today</span>
                    <span className="font-bold text-slate-200">{b.cuts_today || 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status</span>
                    <span className="capitalize text-emerald-400 font-semibold">{b.status}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEditBarber(b)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 size={14} />
                    <span>{t.editBarber}</span>
                  </button>
                  <button
                    onClick={() => toggleBarberActive(b)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      b.is_active ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {b.is_active ? t.deactivate : t.activate}
                  </button>
                  <button
                    onClick={() => {
                      const linkedUser = staffUsers.find(u => u.barber_id === b.id) || { id: b.id, name: b.name, role: 'barber' };
                      setTargetPinUser(linkedUser);
                      setShowResetPinModal(true);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-amber-400 text-xs transition cursor-pointer border border-slate-700/60"
                    title="Reset Staff PIN"
                  >
                    <KeyRound size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Staff Security & All PINs Management Table (Owner Only) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 mt-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound size={18} className="text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  {lang === 'am' ? 'የሰራተኞች አካውንትና የፒን (PIN) ማስተዳደሪያ' : 'Staff Accounts & Master PIN Security'}
                </h3>
              </div>
              <span className="text-xs text-slate-500">
                {lang === 'am' ? 'ባለቤቱ ማንኛውንም የተረሳ ፒን እዚህ መቀየር ይችላል' : 'Owner can reset any forgotten PIN here'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Staff Member</th>
                    <th className="py-2.5 px-3 font-semibold">Role</th>
                    <th className="py-2.5 px-3 font-semibold">Username</th>
                    <th className="py-2.5 px-3 font-semibold">Current PIN</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {staffUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-2">
                        <span>{u.role === 'owner' ? '👑' : u.role === 'cashier' ? '💳' : '✂️'}</span>
                        <span>{u.name}</span>
                        {u.chair_number && <span className="text-[10px] text-slate-400 font-mono">(Chair #{u.chair_number})</span>}
                      </td>
                      <td className="py-2.5 px-3 uppercase font-mono text-[10px] text-slate-400">{u.role}</td>
                      <td className="py-2.5 px-3 font-mono text-cyan-400">{u.username}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400 tracking-wider">
                        {u.pin_code || '••••'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setTargetPinUser(u);
                            setShowResetPinModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                        >
                          {lang === 'am' ? 'ፒን ቀይር' : 'Reset PIN'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: DYNAMIC SERVICES & PRICING MANAGEMENT */}
      {adminTab === 'services' && (
        <div className="space-y-4">
          
          {/* Top Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Services & Dynamic Price List</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any price in the table to edit it instantly. Changes reflect immediately across POS and Remote Booking.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAdjust(50)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Increase all prices by 50 ETB"
              >
                +50 ETB All
              </button>
              <button
                onClick={() => handleBulkAdjust(-50)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Decrease all prices by 50 ETB"
              >
                -50 ETB All
              </button>
              <button
                onClick={openAddService}
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-amber-500/20 whitespace-nowrap"
              >
                <Plus size={16} />
                <span>{t.addService}</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', en: 'All Services', am: 'ሁሉም አገልግሎቶች' },
              { id: 'haircut', en: 'Haircut', am: 'ፀጉር ቁረጥ' },
              { id: 'beard', en: 'Beard', am: 'ጢም' },
              { id: 'combo', en: 'Combo', am: 'ጥምር' },
              { id: 'facial', en: 'Facial', am: 'የፊት' },
              { id: 'treatment', en: 'Treatment', am: 'ትሪትመንት' },
              { id: 'product', en: 'Product', am: 'እቃዎች' }
            ].map(cat => {
              const count = cat.id === 'all' 
                ? servicesList.length 
                : servicesList.filter(s => s.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setServiceCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    serviceCategoryFilter === cat.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{lang === 'am' ? cat.am : cat.en}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    serviceCategoryFilter === cat.id ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Services Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Service Name</th>
                    <th className="py-3 px-4 font-semibold">Amharic Name</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold text-amber-400">Price (Click to Edit)</th>
                    <th className="py-3 px-4 font-semibold">Duration</th>
                    <th className="py-3 px-4 font-semibold">Commission Split</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {servicesList
                    .filter(s => serviceCategoryFilter === 'all' || s.category === serviceCategoryFilter)
                    .map(s => {
                      const isEditingThisPrice = quickPriceEditId === s.id;
                      const isRecentlyUpdated = quickPriceSuccessId === s.id;

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-100 flex items-center gap-2">
                            <span>{s.name}</span>
                            {!s.is_active && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{s.amharic_name}</td>
                          <td className="py-3.5 px-4 capitalize">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                              {s.category}
                            </span>
                          </td>

                          {/* Dynamic Inline Price Editor */}
                          <td className="py-3 px-4">
                            {isEditingThisPrice ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  autoFocus
                                  value={quickPriceVal}
                                  onChange={e => setQuickPriceVal(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleQuickPriceSave(s.id);
                                    if (e.key === 'Escape') setQuickPriceEditId(null);
                                  }}
                                  className="w-20 bg-slate-950 border border-amber-500 rounded-lg px-2 py-1 text-sm font-black text-amber-400 focus:outline-none"
                                />
                                <span className="text-[10px] text-slate-400">ETB</span>
                                <button
                                  onClick={() => handleQuickPriceSave(s.id)}
                                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                                  title="Save price"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => setQuickPriceEditId(null)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startQuickPriceEdit(s)}
                                className={`group px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition cursor-pointer ${
                                  isRecentlyUpdated
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                    : 'bg-slate-800/60 border-slate-700/60 hover:border-amber-500 text-amber-400'
                                }`}
                                title="Click to edit price"
                              >
                                <span className="font-black text-sm">{s.price} ETB</span>
                                {isRecentlyUpdated ? (
                                  <Check size={12} className="text-emerald-400" />
                                ) : (
                                  <Edit3 size={11} className="opacity-40 group-hover:opacity-100 text-amber-400" />
                                )}
                              </button>
                            )}
                          </td>

                          <td className="py-3.5 px-4">{s.duration_minutes > 0 ? `${s.duration_minutes} min` : 'Retail'}</td>
                          <td className="py-3.5 px-4 font-bold text-indigo-400">{(s.commission_rate * 100).toFixed(0)}%</td>

                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => openEditService(s)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                            >
                              Edit Details
                            </button>
                            <button
                              onClick={() => toggleServiceActive(s)}
                              className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                                s.is_active ? 'text-slate-400 hover:text-red-400' : 'text-emerald-400 hover:bg-emerald-500/10'
                              }`}
                            >
                              {s.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteService(s)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                              title="Delete Service"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: SHOP PROFILE & BRANDING (DYNAMIC LOGO, NAME, ADDRESS, BRANCH) */}
      {adminTab === 'branding' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Store size={20} className="text-amber-400" />
                <span>{lang === 'am' ? 'የሱቅ መረጃ፣ ሎጎና ቅርንጫፍ ማስተዳደሪያ' : 'Shop Profile, Logo & Branch Management'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'am' 
                  ? 'የሱቁን ሎጎ፣ ስም፣ አድራሻ እና ቅርንጫፍ እዚህ ይቀይሩ። በዋናው ሄደር፣ ደረሰኝ እና ቴሌግራም ሪፖርት ላይ በቀጥታ ይንጸባረቃል።' 
                  : 'Customize your barbershop logo, brand name, address, and branch. Changes update live across the header, customer receipts, and reports.'}
              </p>
            </div>

            {saveSuccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle2 size={16} />
                <span>{lang === 'am' ? 'የሱቅ መረጃ በተሳካ ሁኔታ ተዘምኗል!' : 'Shop Profile Updated Successfully!'}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Form: Logo, Name, Branch, Address, Phone (7 Cols) */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSaveBranding} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-5 shadow-xl">
                
                {/* 1. Logo Section */}
                <div className="space-y-3 pb-4 border-b border-slate-800">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Image size={15} className="text-amber-400" />
                    <span>{lang === 'am' ? 'የሱቅ ሎጎ (Shop Logo)' : 'Shop Logo'}</span>
                  </label>

                  {/* Logo Preview & Type Selector */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Live Box */}
                    <div className="relative">
                      {brandingForm.logo_url ? (
                        <img 
                          src={brandingForm.logo_url} 
                          alt="Logo Preview" 
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-500 shadow-lg shadow-amber-500/20 bg-slate-950" 
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 text-3xl">
                          {brandingForm.logo_icon === 'barberpole' ? '💈' :
                           brandingForm.logo_icon === 'crown' ? '👑' :
                           brandingForm.logo_icon === 'sparkles' ? '✨' :
                           brandingForm.logo_icon === 'shield' ? '🛡️' :
                           brandingForm.logo_icon === 'razor' ? '🪒' :
                           <Scissors size={28} className="rotate-45" />}
                        </div>
                      )}
                    </div>

                    {/* Logo Options */}
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-slate-400">
                        {lang === 'am' ? 'የሚመርጡትን ምልክት ይምረጡ ወይም የራስዎን ሎጎ ፎቶ ይጫኑ:' : 'Choose a preset icon or upload your custom logo image:'}
                      </p>

                      {/* Preset Icons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { id: 'scissors', label: 'Scissors', icon: '✂️' },
                          { id: 'barberpole', label: 'Barber Pole', icon: '💈' },
                          { id: 'crown', label: 'Crown', icon: '👑' },
                          { id: 'sparkles', label: 'Luxury', icon: '✨' },
                          { id: 'shield', label: 'Shield', icon: '🛡️' },
                          { id: 'razor', label: 'Razor', icon: '🪒' }
                        ].map(preset => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setBrandingForm(prev => ({ ...prev, logo_icon: preset.id, logo_url: '' }))}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
                              !brandingForm.logo_url && brandingForm.logo_icon === preset.id
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span>{preset.icon}</span>
                            <span className="text-[11px]">{preset.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Upload or URL Option */}
                      <div className="flex items-center gap-2 pt-1">
                        <label className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5 transition">
                          <Upload size={13} className="text-amber-400" />
                          <span>{lang === 'am' ? 'ፎቶ / ሎጎ ጫን' : 'Upload Image'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLogoUpload} 
                            className="hidden" 
                          />
                        </label>

                        {brandingForm.logo_url && (
                          <button
                            type="button"
                            onClick={() => setBrandingForm(prev => ({ ...prev, logo_url: '' }))}
                            className="py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-red-950/40 text-red-400 border border-slate-800 hover:border-red-500/30 text-xs transition cursor-pointer"
                          >
                            {lang === 'am' ? 'ፎቶውን አስወግድ' : 'Remove Image'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Or Custom URL */}
                  <div>
                    <input
                      type="url"
                      value={brandingForm.logo_url}
                      onChange={e => setBrandingForm(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder={lang === 'am' ? 'ወይም የሎጎ ፎቶ ማስፈንጠሪያ (Image URL) እዚህ ይለጥፉ...' : 'Or paste direct image URL (https://...)'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 2. Shop Name (English & Amharic) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      {lang === 'am' ? 'የሱቅ ስም (እንግሊዝኛ) *' : 'Shop Name (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={brandingForm.shop_name}
                      onChange={e => setBrandingForm({ ...brandingForm, shop_name: e.target.value })}
                      placeholder="e.g. SmartBarber"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      {lang === 'am' ? 'የሱቅ ስም (አማርኛ)' : 'Shop Name (Amharic)'}
                    </label>
                    <input
                      type="text"
                      value={brandingForm.shop_name_amharic}
                      onChange={e => setBrandingForm({ ...brandingForm, shop_name_amharic: e.target.value })}
                      placeholder="ምሳሌ፡ ስማርት ባርበር"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 3. Branch Name (English & Amharic) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1.5">
                      <MapPin size={13} className="text-amber-400" />
                      <span>{lang === 'am' ? 'የቅርንጫፍ ስም (እንግሊዝኛ) *' : 'Branch Name (English) *'}</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={brandingForm.branch_name}
                      onChange={e => setBrandingForm({ ...brandingForm, branch_name: e.target.value })}
                      placeholder="e.g. Bole Executive Branch"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      {lang === 'am' ? 'የቅርንጫፍ ስም (አማርኛ)' : 'Branch Name (Amharic)'}
                    </label>
                    <input
                      type="text"
                      value={brandingForm.branch_name_amharic}
                      onChange={e => setBrandingForm({ ...brandingForm, branch_name_amharic: e.target.value })}
                      placeholder="ምሳሌ፡ ቦሌ ኤክስኪዩቲቭ ቅርንጫፍ"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 4. Physical Address (English & Amharic) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      {lang === 'am' ? 'አድራሻ (እንግሊዝኛ) *' : 'Physical Address (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={brandingForm.address}
                      onChange={e => setBrandingForm({ ...brandingForm, address: e.target.value })}
                      placeholder="e.g. Cameroon St, Next to Edna Mall, Bole"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1">
                      {lang === 'am' ? 'አድራሻ (አማርኛ)' : 'Physical Address (Amharic)'}
                    </label>
                    <input
                      type="text"
                      value={brandingForm.address_amharic}
                      onChange={e => setBrandingForm({ ...brandingForm, address_amharic: e.target.value })}
                      placeholder="ምሳሌ፡ ካሜሩን ጎዳና፣ ኤድና ሞል አጠገብ፣ ቦሌ"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* 5. Phone Number */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1.5">
                    <Phone size={13} className="text-amber-400" />
                    <span>{lang === 'am' ? 'የሱቅ ስልክ ቁጥር' : 'Shop Contact Phone'}</span>
                  </label>
                  <input
                    type="tel"
                    value={brandingForm.phone}
                    onChange={e => setBrandingForm({ ...brandingForm, phone: e.target.value })}
                    placeholder="+251 911 244 556"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="w-full py-3.5 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    {savingSettings ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>{lang === 'am' ? 'እየተመዘገበ ነው...' : 'Saving Changes...'}</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>{lang === 'am' ? 'ለውጦቹን መዝግብና ተግብር' : 'Save & Apply Shop Branding'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Real-Time Previews (5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* Preview 1: Header Brand Tile */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>{lang === 'am' ? 'የዋናው ገጽ ሄደር እይታ' : 'Live Header Brand Preview'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Screen Top</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                  {brandingForm.logo_url ? (
                    <img 
                      src={brandingForm.logo_url} 
                      alt="Preview" 
                      className="w-11 h-11 rounded-xl object-cover border border-amber-500/40 shadow-md bg-slate-900 shrink-0" 
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md text-xl shrink-0">
                      {brandingForm.logo_icon === 'barberpole' ? '💈' :
                       brandingForm.logo_icon === 'crown' ? '👑' :
                       brandingForm.logo_icon === 'sparkles' ? '✨' :
                       brandingForm.logo_icon === 'shield' ? '🛡️' :
                       brandingForm.logo_icon === 'razor' ? '🪒' :
                       <Scissors size={24} className="rotate-45" />}
                    </div>
                  )}

                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base tracking-tight text-white truncate">
                        {brandingForm.shop_name || 'SmartBarber'}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                        ET 🇪🇹
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      {brandingForm.branch_name || 'Bole Branch'} • {brandingForm.address || 'Addis Ababa'}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  {lang === 'am' 
                    ? 'ይህ በሁሉም ገጾች የላይኛው መስመር ላይ ለካሸር፣ ለባርበሮችና ለደንበኞች የሚታይ ነው።' 
                    : 'This appears pinned to the top navigation header on all screens.'}
                </p>
              </div>

              {/* Preview 2: Thermal Receipt Print Header */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>{lang === 'am' ? 'የታተመ ደረሰኝ ራስጌ እይታ' : 'Printed 58mm Thermal Receipt Preview'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">58mm Paper</span>
                </div>

                {/* Simulated Paper Receipt */}
                <div className="bg-white text-slate-900 p-4 rounded-xl font-mono text-xs shadow-md border border-slate-300 text-center space-y-1">
                  {brandingForm.logo_url && (
                    <img 
                      src={brandingForm.logo_url} 
                      alt="Logo" 
                      className="w-10 h-10 object-contain mx-auto mb-1 rounded-lg" 
                    />
                  )}
                  <h4 className="font-black text-sm uppercase tracking-wider text-black">
                    {brandingForm.shop_name || 'SmartBarber'}
                  </h4>
                  {brandingForm.branch_name && (
                    <p className="text-[11px] font-bold text-slate-800">
                      {brandingForm.branch_name}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-700">
                    {brandingForm.address || 'Addis Ababa, Ethiopia'}
                  </p>
                  {brandingForm.phone && (
                    <p className="text-[10px] text-slate-700">
                      Tel: {brandingForm.phone}
                    </p>
                  )}
                  <div className="mt-2 inline-block px-2 py-0.5 bg-slate-200 text-black font-bold rounded text-[10px]">
                    OFFICIAL SALES RECEIPT
                  </div>
                  <p className="text-[9px] text-slate-400 border-t border-dashed border-slate-300 pt-2 mt-2">
                    Printed at customer checkout
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}



      {/* BARBER ADD / EDIT MODAL */}
      {showBarberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              {editingBarber ? t.editBarber : t.addBarber}
            </h3>

            <form onSubmit={handleSaveBarber} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{t.barberName} *</label>
                <input
                  type="text"
                  required
                  value={barberForm.name}
                  onChange={e => setBarberForm({ ...barberForm, name: e.target.value })}
                  placeholder="e.g. Solomon Kassa"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t.barberAmharicName}</label>
                <input
                  type="text"
                  value={barberForm.amharic_name}
                  onChange={e => setBarberForm({ ...barberForm, amharic_name: e.target.value })}
                  placeholder="ምሳሌ፡ ሰለሞን ካሳ"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">{t.chairNumber}</label>
                  <input
                    type="number"
                    min="1"
                    value={barberForm.chair_number}
                    onChange={e => setBarberForm({ ...barberForm, chair_number: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t.commissionRate}</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="1.0"
                    value={barberForm.commission_rate}
                    onChange={e => setBarberForm({ ...barberForm, commission_rate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t.barberPhone}</label>
                <input
                  type="tel"
                  value={barberForm.phone}
                  onChange={e => setBarberForm({ ...barberForm, phone: e.target.value })}
                  placeholder="0911..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBarberModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  {t.saveBarber}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE ADD / EDIT MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              {editingService ? t.editService : t.addService}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">{t.serviceName} *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g. Royal Shave"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">{t.serviceAmharicName}</label>
                <input
                  type="text"
                  value={serviceForm.amharic_name}
                  onChange={e => setServiceForm({ ...serviceForm, amharic_name: e.target.value })}
                  placeholder="ምሳሌ፡ ልዩ የጢም መላጨት"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">{t.serviceCategory || 'Category'} *</label>
                  <select
                    value={serviceForm.category}
                    onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-medium cursor-pointer focus:outline-none focus:border-amber-500 capitalize"
                  >
                    <option value="haircut">{lang === 'am' ? 'ፀጉር ቁረጥ (Haircut)' : 'Haircut'}</option>
                    <option value="beard">{lang === 'am' ? 'ጢም (Beard)' : 'Beard'}</option>
                    <option value="combo">{lang === 'am' ? 'ጥምር / ኮምቦ (Combo)' : 'Combo'}</option>
                    <option value="facial">{lang === 'am' ? 'የፊት እንክብካቤ (Facial)' : 'Facial'}</option>
                    <option value="treatment">{lang === 'am' ? 'ህክምና / ትሪትመንት (Treatment)' : 'Treatment'}</option>
                    <option value="product">{lang === 'am' ? 'የውበት እቃዎች (Product)' : 'Product'}</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t.priceETB} *</label>
                  <input
                    type="number"
                    required
                    value={serviceForm.price}
                    onChange={e => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">{t.durationMins}</label>
                  <input
                    type="number"
                    value={serviceForm.duration_minutes}
                    onChange={e => setServiceForm({ ...serviceForm, duration_minutes: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">{t.commissionRate || 'Commission Split'}</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1.0"
                    value={serviceForm.commission_rate}
                    onChange={e => setServiceForm({ ...serviceForm, commission_rate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Telegram Report Preview Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Send size={20} />
                <h3 className="font-bold text-slate-100">{t.telegramModalTitle}</h3>
              </div>
              <button onClick={() => setShowTelegramModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-200 whitespace-pre-wrap max-h-[300px] overflow-y-auto border border-slate-800">
              {telegramText}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-emerald-400 font-medium">{copied && t.copied}</span>
              <button
                onClick={handleCopyTelegram}
                className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Copy size={16} />
                <span>{t.telegramCopyBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Staff PIN Reset / Change Modal */}
      <ChangePinModal
        isOpen={showResetPinModal}
        onClose={() => setShowResetPinModal(false)}
        targetUser={targetPinUser}
        lang={lang}
        onSuccess={loadAllData}
      />
    </div>
  );
}
