import React, { useState, useEffect } from 'react';
import { 
  Scissors, Users, User, BarChart3, Globe, 
  Sparkles, ShieldCheck, ShieldAlert, Lock, Unlock, LogOut, ChevronDown, FileText,
  Calendar, Clock, KeyRound
} from 'lucide-react';
import POSPage from './pages/POSPage';
import QueuePage from './pages/QueuePage';
import BarberPage from './pages/BarberPage';
import AdminPage from './pages/AdminPage';
import DailyReconciliationView from './components/DailyReconciliationView';
import LoginModal from './components/LoginModal';
import SubscriptionModal from './components/SubscriptionModal';
import { getUser, clearSession } from './utils/auth';
import { translations } from './locales/i18n';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getUser());
  const [activeTab, setActiveTab] = useState('pos'); // 'pos', 'queue', 'barber', 'admin'
  const [lang, setLang] = useState('en'); // 'en' or 'am'
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [settings, setSettings] = useState({
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

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data) {
        setSettings(prev => ({ ...prev, ...data.data }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadSubscription = async () => {
    try {
      const res = await fetch('/api/subscription/status');
      const data = await res.json();
      if (data.success && data.data) {
        setSubscription(data.data);
        if (data.data.isExpired) {
          setShowSubscriptionModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  };

  useEffect(() => {
    loadSettings();
    loadSubscription();
    window.addEventListener('settings-change', loadSettings);
    window.addEventListener('subscription-change', loadSubscription);
    const subTimer = setInterval(loadSubscription, 60000);
    return () => {
      window.removeEventListener('settings-change', loadSettings);
      window.removeEventListener('subscription-change', loadSubscription);
      clearInterval(subTimer);
    };
  }, []);

  const t = translations[lang];

  // Live timer for system date and clock (updates every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysAm = ['እሁድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ'];

  const pad = (n) => String(n).padStart(2, '0');
  const formattedDate = `${pad(currentDateTime.getDate())}/${pad(currentDateTime.getMonth() + 1)}/${currentDateTime.getFullYear()}`;
  const dayName = lang === 'am' ? daysAm[currentDateTime.getDay()] : daysEn[currentDateTime.getDay()];
  const formattedTime = currentDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  // Listen to auth changes
  useEffect(() => {
    const handleAuthChange = () => {
      const u = getUser();
      setCurrentUser(u);

      // Adjust tab based on role automatically
      if (u.role === 'barber') {
        setActiveTab('barber');
      } else if (u.role === 'customer') {
        setActiveTab('queue');
      } else if (u.role === 'cashier') {
        if (activeTab === 'admin') setActiveTab('pos');
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, [activeTab]);

  const toggleLanguage = () => {
    setLang(prev => (prev === 'en' ? 'am' : 'en'));
  };

  // RBAC Permission checks
  const canAccessPOS = currentUser.role === 'owner' || currentUser.role === 'cashier';
  const canAccessAdmin = currentUser.role === 'owner';
  const canAccessReconciliation = currentUser.role === 'cashier';
  const canAccessBarber = currentUser.role === 'owner' || currentUser.role === 'barber';
  const canAccessQueue = true; // All roles can see queue

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        
        {/* Top Utility Bar: System Date & Live Clock Banner */}
        <div className="bg-slate-950/95 border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-1.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            
            {/* Left: System Operational Date & Live Time */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300">
                <Calendar size={14} className="text-amber-400 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  {lang === 'am' ? 'የሲስተም ቀን' : 'System Date'}:
                </span>
                <span className="font-mono font-bold text-white text-xs">
                  {formattedDate}
                </span>
                <span className="text-amber-400 font-bold text-xs">
                  ({dayName})
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs">
                <Clock size={12} className="text-amber-400 shrink-0" />
                <span>{formattedTime}</span>
              </div>
            </div>

            {/* Right: Operational Status & Subscription Indicator */}
            <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] text-slate-400 flex-wrap">
              {/* Subscription Pill */}
              <button 
                type="button"
                onClick={() => setShowSubscriptionModal(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold text-xs transition cursor-pointer ${
                  subscription?.isExpired
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25 animate-pulse'
                    : subscription?.isExpiringSoon
                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-300 hover:bg-amber-500/25'
                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                }`}
                title="View Subscription & License"
              >
                {subscription?.isExpired ? (
                  <ShieldAlert size={13} className="text-rose-400" />
                ) : (
                  <ShieldCheck size={13} className={subscription?.isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'} />
                )}
                <span>
                  {subscription?.isExpired 
                    ? (lang === 'am' ? '🔴 ፈቃዱ አልቋል' : '🔴 License Expired')
                    : `${subscription?.timeRemainingText || (subscription?.daysRemaining + ' days')} ${lang === 'am' ? 'ቀረ' : 'left'}`}
                </span>
              </button>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{lang === 'am' ? 'ሲስተም ዝግጁ' : 'System Online'}</span>
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-slate-300 font-semibold">
                📍 {lang === 'am' ? (settings.branch_name_amharic || settings.branch_name || 'ቦሌ ኤክስኪዩቲቭ ቅርንጫፍ') : (settings.branch_name || 'Bole Executive Branch')}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* Brand Logo & Shop Name */}
            <div className="flex items-center gap-3 shrink-0">
              {settings.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt="Shop Logo" 
                  className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shadow-md shadow-amber-500/20 bg-slate-900"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20 text-lg">
                  {settings.logo_icon === 'barberpole' ? '💈' :
                   settings.logo_icon === 'crown' ? '👑' :
                   settings.logo_icon === 'sparkles' ? '✨' :
                   settings.logo_icon === 'shield' ? '🛡️' :
                   settings.logo_icon === 'razor' ? '🪒' :
                   <Scissors size={22} className="rotate-45" />}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    {lang === 'am' ? (settings.shop_name_amharic || settings.shop_name || 'ስማርት ባርበር') : (settings.shop_name || 'SmartBarber')}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    ET 🇪🇹
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden lg:block">
                  {lang === 'am' 
                    ? `${settings.branch_name_amharic || settings.branch_name || 'ቦሌ ቅርንጫፍ'} • ${settings.address_amharic || settings.address || ''}`
                    : `${settings.branch_name || 'Bole Branch'} • ${settings.address || ''}`}
                </p>
              </div>
            </div>

            {/* Navigation Tabs (Filtered by RBAC Role) */}
            <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
              
              {/* POS Tab (Owner & Cashier) */}
              {canAccessPOS && (
                <button
                  onClick={() => setActiveTab('pos')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                    activeTab === 'pos'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Scissors size={14} />
                  <span>{t.nav.pos}</span>
                </button>
              )}

              {/* Cashier Daily Reconciliation & Telegram Tab */}
              {canAccessReconciliation && (
                <button
                  onClick={() => setActiveTab('reconciliation')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                    activeTab === 'reconciliation'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText size={14} />
                  <span>{lang === 'am' ? 'የቀን ማጠቃለያና ቴሌግራም' : 'Daily Reconciliation'}</span>
                </button>
              )}

              {/* Live Queue */}
              <button
                onClick={() => setActiveTab('queue')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'queue'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users size={14} />
                <span>{t.nav.queue}</span>
              </button>

              {/* Barber Portal (Owner & Barber) */}
              {canAccessBarber && (
                <button
                  onClick={() => setActiveTab('barber')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                    activeTab === 'barber'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User size={14} />
                  <span>{t.nav.barbers}</span>
                </button>
              )}

              {/* Owner Management Tab (Owner Only) */}
              {canAccessAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart3 size={14} />
                  <span>{t.nav.reports}</span>
                </button>
              )}
            </nav>

            {/* Right Side: Role Switcher & Language Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* RBAC Role Indicator / Switcher Pill */}
              <button
                onClick={() => setShowLoginModal(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  currentUser.role === 'owner' ? 'bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-900/40' :
                  currentUser.role === 'cashier' ? 'bg-blue-950/40 border-blue-500/40 text-blue-300 hover:bg-blue-900/40' :
                  currentUser.role === 'barber' ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40' :
                  'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                }`}
                title="Click to Switch Role or Log In"
              >
                <span>
                  {currentUser.role === 'owner' && '👑'}
                  {currentUser.role === 'cashier' && '💳'}
                  {currentUser.role === 'barber' && '✂️'}
                  {currentUser.role === 'customer' && '📱'}
                </span>
                <span className="hidden sm:inline truncate max-w-[110px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] uppercase font-mono opacity-80">
                  ({currentUser.role})
                </span>
                <ChevronDown size={13} className="opacity-70" />
              </button>

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 cursor-pointer"
                title="Switch Language"
              >
                <Globe size={14} className="text-amber-400" />
                <span className="hidden sm:inline">{t.nav.switchLang}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with RBAC Access Guards */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Guard for POS */}
        {activeTab === 'pos' && (
          canAccessPOS ? (
            <POSPage lang={lang} currentUser={currentUser} />
          ) : (
            <AccessDeniedMessage role={currentUser.role} requiredRole="Cashier or Owner" lang={lang} onSwitch={() => setShowLoginModal(true)} />
          )
        )}

        {/* Daily Reconciliation for Reception Cashier */}
        {activeTab === 'reconciliation' && (
          canAccessPOS ? (
            <DailyReconciliationView lang={lang} currentUser={currentUser} />
          ) : (
            <AccessDeniedMessage role={currentUser.role} requiredRole="Cashier or Owner" lang={lang} onSwitch={() => setShowLoginModal(true)} />
          )
        )}


        {/* Live Queue */}
        {activeTab === 'queue' && (
          <QueuePage lang={lang} currentUser={currentUser} />
        )}

        {/* Barber Portal */}
        {activeTab === 'barber' && (
          canAccessBarber ? (
            <BarberPage lang={lang} currentUser={currentUser} />
          ) : (
            <AccessDeniedMessage role={currentUser.role} requiredRole="Barber or Owner" lang={lang} onSwitch={() => setShowLoginModal(true)} />
          )
        )}

        {/* Owner Management */}
        {activeTab === 'admin' && (
          canAccessAdmin ? (
            <AdminPage lang={lang} currentUser={currentUser} />
          ) : (
            <AccessDeniedMessage role={currentUser.role} requiredRole="Shop Owner" lang={lang} onSwitch={() => setShowLoginModal(true)} />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>SmartBarber Ethiopia • Protected with Role-Based Access Control (RBAC)</p>
      </footer>

      {/* RBAC Login / Switcher Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        lang={lang}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* Subscription & Workstation License Modal */}
      {(showSubscriptionModal || subscription?.isExpired) && (
        <SubscriptionModal
          lang={lang}
          subscription={subscription}
          isBlocking={subscription?.isExpired}
          onClose={() => setShowSubscriptionModal(false)}
          onActivated={(updated) => {
            loadSubscription();
            if (!updated?.isExpired) {
              setShowSubscriptionModal(false);
            }
          }}
        />
      )}
    </div>
  );
}

// Access Denied Banner when unauthorized role tries to view a protected page
function AccessDeniedMessage({ role, requiredRole, lang, onSwitch }) {
  const isAmharic = lang === 'am';
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
        <Lock size={30} />
      </div>
      <h2 className="text-xl font-bold text-slate-100">
        {isAmharic ? 'ይህንን ገጽ ለማየት ፈቃድ የለዎትም (Access Denied)' : 'Access Restricted by RBAC'}
      </h2>
      <p className="text-xs text-slate-400 max-w-sm mx-auto">
        {isAmharic 
          ? `ይህ ገጽ ለ[${requiredRole}] ብቻ የተፈቀደ ነው። የእርስዎ አሁን ያለ ሚና፡ [${role}]`
          : `This section is restricted to [${requiredRole}]. Your active role is [${role}].`}
      </p>
      <button
        onClick={onSwitch}
        className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
      >
        {isAmharic ? 'ሚና ቀይር / ግባ' : 'Switch Role / Log In'}
      </button>
    </div>
  );
}
