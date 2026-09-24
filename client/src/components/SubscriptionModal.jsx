import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ShieldAlert, KeyRound, Copy, Check, Sparkles, 
  Clock, AlertTriangle, Send, X, RefreshCw, Laptop, Wrench, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { translations } from '../locales/i18n';

export default function SubscriptionModal({ 
  lang = 'en', 
  subscription, 
  onClose, 
  onActivated, 
  isBlocking = false 
}) {
  const t = translations[lang].subscription;
  const [activeTab, setActiveTab] = useState('remote'); // 'remote' or 'onsite'
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Developer maintenance override state
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState('');

  const copyMachineId = () => {
    if (subscription?.machineId) {
      navigator.clipboard.writeText(subscription.machineId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      setErrorMsg('Please enter or paste a valid license key.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: licenseKeyInput.trim() })
      });
      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message || t.successMsg);
        setLicenseKeyInput('');
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (_) {}
        if (onActivated) onActivated(data.data);
      } else {
        setErrorMsg(data.error || 'Failed to activate license key.');
      }
    } catch (err) {
      setErrorMsg('Network error: Could not reach backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Developer One-Time Challenge State (Zero hardcoded PINs)
  const [challengeCode, setChallengeCode] = useState('');
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [otpTokenInput, setOtpTokenInput] = useState('');

  const fetchChallenge = async () => {
    try {
      const res = await fetch('/api/subscription/challenge');
      const data = await res.json();
      if (data.success && data.data) {
        setChallengeCode(data.data.challenge);
      }
    } catch (err) {
      console.error('Failed to load challenge:', err);
    }
  };

  useEffect(() => {
    fetchChallenge();
  }, []);

  const copyChallenge = () => {
    if (challengeCode) {
      navigator.clipboard.writeText(challengeCode);
      setCopiedChallenge(true);
      setTimeout(() => setCopiedChallenge(false), 2000);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpTokenInput.trim()) {
      setDevError('Please enter the signed One-Time Pass.');
      return;
    }
    setDevLoading(true);
    setDevError('');
    try {
      const res = await fetch('/api/subscription/challenge/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpToken: otpTokenInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setOtpTokenInput('');
        try { confetti({ particleCount: 60, spread: 60 }); } catch (_) {}
        if (onActivated) onActivated(data.data);
      } else {
        setDevError(data.error || 'Failed to verify OTP.');
      }
    } catch (err) {
      setDevError('Network error connecting to server.');
    } finally {
      setDevLoading(false);
    }
  };

  const isExpired = subscription?.isExpired;
  const isExpiringSoon = subscription?.isExpiringSoon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Top Header Banner */}
        <div className={`p-6 border-b ${
          isExpired 
            ? 'bg-rose-950/40 border-rose-900/50' 
            : isExpiringSoon 
              ? 'bg-amber-950/30 border-amber-900/40' 
              : 'bg-emerald-950/30 border-emerald-900/40'
        } flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
              isExpired 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                : isExpiringSoon 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {isExpired ? <ShieldAlert size={26} /> : <ShieldCheck size={26} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {t.title}
              </h2>
              <p className="text-xs text-slate-400">
                {isExpired ? t.expiredWarningTitle : (subscription?.plan || 'Standard Subscription')}
              </p>
            </div>
          </div>

          {!isBlocking && onClose && (
            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={t.close}
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="p-6 sm:p-7 space-y-6">

          {/* Status Alert Banner */}
          {isExpired ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-rose-300">
              <AlertTriangle size={20} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-rose-200 block text-sm">
                  {t.statusExpired}
                </span>
                <p className="text-rose-300/90 leading-relaxed">
                  {t.expiredWarningDesc}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  {t.daysLeft}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${
                    isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {subscription?.timeRemainingText || `${subscription?.daysRemaining ?? 0} Days`}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  {t.validUntil}
                </span>
                <span className="text-sm font-bold text-white block mt-1">
                  {subscription?.formattedExpiry || 'N/A'}
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {subscription?.plan}
                </span>
              </div>
            </div>
          )}

          {/* Activation Navigation Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('remote')}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'remote'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound size={14} />
              <span>{lang === 'am' ? 'የፈቃድ ቁልፍ (Remote Key)' : 'Remote License Key'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('onsite');
                if (!challengeCode) fetchChallenge();
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'onsite'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap size={14} />
              <span>{lang === 'am' ? 'ቀጥታ ማግበሪያ (On-Site Activation)' : 'On-Site Activation (OTP)'}</span>
            </button>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2.5 animate-fade-in">
              <Sparkles size={18} className="text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-fade-in">
              <AlertTriangle size={18} className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: REMOTE LICENSE KEY */}
          {activeTab === 'remote' && (
            <div className="space-y-4 animate-fade-in">
              {/* Workstation Machine ID Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop size={14} className="text-amber-400" />
                    {t.machineId}
                  </span>
                  <button 
                    type="button"
                    onClick={copyMachineId}
                    className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedId ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400">{t.idCopied}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>{t.copyId}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800/80 rounded-xl px-4 py-3 font-mono font-bold text-amber-300 text-base sm:text-lg tracking-wider text-center select-all">
                  {subscription?.machineId || 'LOADING-ID...'}
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  {lang === 'am' 
                    ? 'የፈቃድ ማደሻ ቁልፍ ለማግኘት ይህንን መለያ ቁጥር ለዲቨሎፐሩ ይላኩ።' 
                    : 'Send this Machine ID to your system provider / developer to issue your renewal key.'}
                </p>
              </div>

              {/* License Key Activation Form */}
              <form onSubmit={handleActivate} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <KeyRound size={14} className="text-amber-400" />
                    {t.enterKey}
                  </label>
                  <textarea 
                    rows="3"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    placeholder={t.enterKeyPlaceholder}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl p-3.5 text-xs text-amber-200 font-mono placeholder:text-slate-600 outline-none transition"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>{t.activating}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{t.activateBtn}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: ON-SITE ACTIVATION (DEVELOPER OTP) */}
          {activeTab === 'onsite' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 leading-relaxed">
                <strong>{lang === 'am' ? 'የቀጥታ ማግበሪያ (On-Site Activation):' : 'On-Site Developer Unlock:'}</strong>{' '}
                {lang === 'am'
                  ? 'ይህንን የማረጋገጫ ኮድ (Challenge Nonce) በስልክዎ የፈቃድ ማመንጫ "On-Site Activation (OTP)" ታብ ውስጥ ያስገቡና ፈጣን የይለፍ ቃል (OTP) ያመንጩ።'
                  : 'Enter this 6-character Challenge Nonce on your phone generator under "On-Site Activation (OTP)" to sign an instant One-Time Pass.'}
              </div>

              {/* Challenge Display */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {lang === 'am' ? 'የማረጋገጫ ኮድ (Challenge)' : 'Workstation Challenge'}
                  </span>
                  <span className="font-mono font-black text-amber-300 text-lg sm:text-xl tracking-widest block my-0.5">
                    {challengeCode || 'GENERATING...'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {lang === 'am' ? 'ለ10 ደቂቃ ብቻ የሚያገለግል (ነጠላ አጠቃቀም)' : 'Valid for 10 minutes (single-use)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={fetchChallenge}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                    title="Generate New Challenge"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={copyChallenge}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedChallenge ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedChallenge ? (lang === 'am' ? 'ኮፒ ሆኗል' : 'Copied') : (lang === 'am' ? 'ኮፒ አድርግ' : 'Copy Challenge')}</span>
                  </button>
                </div>
              </div>

              {/* OTP Pass Input Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {lang === 'am' ? 'ከስልክዎ የተፈረመውን OTP እዚህ ያስገቡ:' : 'Enter Signed OTP Pass (from phone generator):'}
                  </label>
                  <input 
                    type="text"
                    value={otpTokenInput}
                    onChange={(e) => setOtpTokenInput(e.target.value)}
                    placeholder="OTP-eyJjaCI6..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3.5 py-3 text-xs text-white font-mono outline-none"
                  />
                </div>

                {devError && <p className="text-xs text-rose-400">{devError}</p>}

                <button 
                  type="submit"
                  disabled={devLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {devLoading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  <span>{lang === 'am' ? 'ሲስተሙን ክፈት (Unlock Workstation)' : 'Unlock Workstation'}</span>
                </button>
              </form>

              <p className="text-[10px] text-slate-500 text-center">
                {lang === 'am' 
                  ? 'ምንም ዓይነት ቋሚ የይለፍ ቃል የለም። በዲቨሎፐሩ የግል ቁልፍ (Private Key) ብቻ የሚፈረም ነጠላ አጠቃቀም ፈቃድ ነው።' 
                  : 'Zero hardcoded passwords. Asymmetrically signed by Developer Private Key.'}
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
