import React, { useState } from 'react';
import { 
  ShieldCheck, ShieldAlert, KeyRound, Copy, Check, Sparkles, 
  Clock, AlertTriangle, Send, X, RefreshCw, Laptop, Wrench
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
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Developer maintenance override state
  const [showDevSection, setShowDevSection] = useState(false);
  const [devPin, setDevPin] = useState('');
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

  const handleDevOverride = async (months, hours) => {
    if (!devPin) {
      setDevError('Please enter the Developer Master PIN.');
      return;
    }
    setDevLoading(true);
    setDevError('');
    try {
      const res = await fetch('/api/subscription/admin-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterPin: devPin, months, hours })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setDevPin('');
        try {
          confetti({ particleCount: 50, spread: 50 });
        } catch (_) {}
        if (onActivated) onActivated(data.data);
      } else {
        setDevError(data.error || 'Invalid Developer Master PIN.');
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
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30 transition flex items-center gap-1.5"
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
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/20 active:scale-[0.99] transition flex items-center justify-center gap-2"
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

          {/* Collapsible On-Site Developer Override */}
          <div className="border-t border-slate-800/80 pt-4">
            <button 
              type="button"
              onClick={() => setShowDevSection(!showDevSection)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-300 font-semibold py-1 transition"
            >
              <span className="flex items-center gap-1.5">
                <Wrench size={13} className="text-slate-400" />
                {t.devPinTitle}
              </span>
              <span>{showDevSection ? '▲' : '▼'}</span>
            </button>

            {showDevSection && (
              <div className="mt-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    {t.devPinPrompt}
                  </label>
                  <input 
                    type="password"
                    maxLength={10}
                    value={devPin}
                    onChange={(e) => setDevPin(e.target.value)}
                    placeholder="Master PIN"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>

                {devError && (
                  <p className="text-[11px] text-rose-400">{devError}</p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <button 
                    type="button"
                    disabled={devLoading}
                    onClick={() => handleDevOverride(0, 1)}
                    className="px-2 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-[11px] font-bold text-rose-300 transition text-center"
                  >
                    ⏱️ +1 Hr (Test)
                  </button>
                  <button 
                    type="button"
                    disabled={devLoading}
                    onClick={() => handleDevOverride(1)}
                    className="px-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 transition text-center"
                  >
                    {t.extend1M}
                  </button>
                  <button 
                    type="button"
                    disabled={devLoading}
                    onClick={() => handleDevOverride(3)}
                    className="px-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 transition text-center"
                  >
                    {t.extend3M}
                  </button>
                  <button 
                    type="button"
                    disabled={devLoading}
                    onClick={() => handleDevOverride(6)}
                    className="px-2 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200 transition text-center"
                  >
                    {t.extend6M}
                  </button>
                  <button 
                    type="button"
                    disabled={devLoading}
                    onClick={() => handleDevOverride(12)}
                    className="px-2 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-bold text-amber-300 transition text-center"
                  >
                    {t.extend1Y}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
