import React, { useState } from 'react';
import { KeyRound, Lock, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { authFetch } from '../utils/auth';

export default function ChangePinModal({ isOpen, onClose, targetUser = null, lang = 'en', onSuccess }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isOwnerResettingOther = Boolean(targetUser && targetUser.id);
  const isAmharic = lang === 'am';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPin.trim().length < 4) {
      setErrorMsg(isAmharic ? 'አዲሱ ፒን ቢያንስ 4 ዲጂት መሆን አለበት' : 'New PIN must be at least 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMsg(isAmharic ? 'አዲሶቹ ፒኖች አይመሳሰሉም' : 'New PINs do not match');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isOwnerResettingOther) {
        // Owner administrative reset
        res = await authFetch(`/api/auth/users/${targetUser.id}/pin`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin_code: newPin.trim() })
        });
      } else {
        // Self-service PIN change
        if (!currentPin.trim()) {
          setErrorMsg(isAmharic ? 'እባክዎ አሁን ያለዎትን ፒን ያስገቡ' : 'Please enter your current PIN');
          setLoading(false);
          return;
        }

        res = await authFetch('/api/auth/change-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            old_pin: currentPin.trim(),
            new_pin: newPin.trim()
          })
        });
      }

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || (isAmharic ? 'ፒኑ በተሳካ ሁኔታ ተቀይሯል!' : 'PIN changed successfully!'));
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(data.error || 'Failed to update PIN');
      }
    } catch (err) {
      setErrorMsg('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-slate-100 space-y-4">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <KeyRound size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-100">
            {isOwnerResettingOther 
              ? (isAmharic ? `ለ${targetUser.name} ፒን ይቀይሩ` : `Reset PIN for ${targetUser.name}`)
              : (isAmharic ? 'የእርስዎን ፒን (PIN) ይቀይሩ' : 'Change Your Account PIN')}
          </h3>
          <p className="text-xs text-slate-400">
            {isOwnerResettingOther
              ? (isAmharic ? 'አዲሱን 4-ዲጂት ፒን ያስገቡ' : 'Set a new 4-digit PIN for this staff member')
              : (isAmharic ? 'የድሮውን ፒን በማስገባት አዲስ ፒን ይምረጡ' : 'Enter current PIN and choose a new 4-digit PIN')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2 text-xs">
          
          {/* Current PIN (Self-service only) */}
          {!isOwnerResettingOther && (
            <div>
              <label className="text-slate-400 block mb-1 font-medium">
                {isAmharic ? 'የአሁኑ ፒን (Current PIN) *' : 'Current PIN *'}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 font-mono text-sm tracking-widest text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* New PIN */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">
              {isAmharic ? 'አዲስ ፒን (New 4-digit PIN) *' : 'New 4-digit PIN *'}
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                maxLength={6}
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="e.g. 7777"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 font-mono text-sm tracking-widest text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Confirm New PIN */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">
              {isAmharic ? 'አዲሱን ፒን ደግመው ያስገቡ *' : 'Confirm New PIN *'}
            </label>
            <div className="relative">
              <KeyRound size={15} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                maxLength={6}
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 font-mono text-sm tracking-widest text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}

          {successMsg && (
            <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{successMsg}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer mt-2"
          >
            {loading ? '...' : (isAmharic ? 'ፒኑን ቀይር' : 'Update PIN')}
          </button>
        </form>
      </div>
    </div>
  );
}
