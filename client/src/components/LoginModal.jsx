import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Lock, Unlock, User, Scissors, CreditCard, 
  X, Check, AlertCircle, Sparkles, Smartphone
} from 'lucide-react';
import { setSession } from '../utils/auth';

const BASE_ACCOUNTS = [
  { role: 'owner', name: 'Shop Owner', amharic_name: 'የሱቅ ባለቤት', pin: '1234', desc: 'Full financial & admin control', chair: null },
  { role: 'cashier', name: 'Reception Cashier', amharic_name: 'የካሸር ዴስክ', pin: '2222', desc: 'POS tickets, receipts & queue', chair: null }
];

export default function LoginModal({ isOpen, onClose, lang = 'en', onLoginSuccess }) {
  const [accounts, setAccounts] = useState(BASE_ACCOUNTS);
  const [selectedAccount, setSelectedAccount] = useState(BASE_ACCOUNTS[0]);
  const [pinInput, setPinInput] = useState(BASE_ACCOUNTS[0].pin);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamically fetch registered barbers when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchBarbers = async () => {
      try {
        const res = await fetch('/api/barbers');
        const data = await res.json();
        const barberAccounts = (data.success && data.data) ? data.data.map(b => ({
          role: 'barber',
          name: b.name,
          amharic_name: b.amharic_name || b.name,
          pin: b.pin_code || '1234',
          desc: `Chair #${b.chair_number} cut sheet & earnings`,
          chair: b.chair_number,
          barber_id: b.id
        })) : [];

        const fullList = [
          ...BASE_ACCOUNTS,
          ...barberAccounts,
          { role: 'customer', name: 'Customer / Guest', amharic_name: 'ደንበኛ / እንግዳ', pin: '', desc: 'Live waiting line display', chair: null }
        ];
        setAccounts(fullList);
      } catch (err) {
        console.error('Failed to fetch barbers for login:', err);
      }
    };
    fetchBarbers();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAccount = (acc) => {
    setSelectedAccount(acc);
    setPinInput(acc.pin); // Pre-fill PIN for rapid switching/testing
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedAccount.role === 'customer') {
      const guest = { id: 0, username: 'guest', name: 'Customer / Guest', role: 'customer', barber_id: null };
      setSession('usr_0_customer', guest);
      if (onLoginSuccess) onLoginSuccess(guest);
      onClose();
      return;
    }

    if (!pinInput.trim()) {
      setErrorMsg('Please enter a PIN');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        role: selectedAccount.role,
        barber_id: selectedAccount.barber_id || null,
        pin: pinInput.trim()
      };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSession(data.token, data.user);
        if (onLoginSuccess) onLoginSuccess(data.user);
        onClose();
      } else {
        setErrorMsg(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setErrorMsg('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-xl font-bold">
            {lang === 'am' ? 'የተጠቃሚ ሚና ይምረጡ (RBAC)' : 'Select Role & Log In (RBAC)'}
          </h2>
          <p className="text-xs text-slate-400">
            {lang === 'am' ? 'የባለቤት፣ የካሸር ወይም የባርበር አካውንት ይምረጡ' : 'Switch role between Owner, Cashier, Barber, or Customer'}
          </p>
        </div>

        {/* Role Presets */}
        <div className="space-y-2">
          {accounts.map((acc, idx) => {
            const isSelected = selectedAccount.role === acc.role && selectedAccount.chair === acc.chair;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectAccount(acc)}
                className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                  isSelected 
                    ? 'bg-amber-500/15 border-amber-500 shadow-md shadow-amber-500/10' 
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                    acc.role === 'owner' ? 'bg-purple-500/20 text-purple-400' :
                    acc.role === 'cashier' ? 'bg-blue-500/20 text-blue-400' :
                    acc.role === 'barber' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {acc.role === 'owner' && '👑'}
                    {acc.role === 'cashier' && '💳'}
                    {acc.role === 'barber' && '✂️'}
                    {acc.role === 'customer' && '📱'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">
                        {lang === 'am' ? acc.amharic_name : acc.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 uppercase font-mono">
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{acc.desc}</p>
                  </div>
                </div>

                <div className="text-right">
                  {acc.pin && (
                    <span className="text-[11px] font-mono text-amber-400/80 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      PIN: {acc.pin}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* PIN Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {selectedAccount.role !== 'customer' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                Enter PIN for <span className="text-amber-400 font-bold">{selectedAccount.name}</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={e => setPinInput(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-center tracking-widest text-lg font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-red-400 text-center font-medium flex items-center justify-center gap-1">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Unlock size={16} />
            <span>
              {selectedAccount.role === 'customer' 
                ? (lang === 'am' ? 'እንደ ደንበኛ ቀጥል' : 'Continue as Customer')
                : (lang === 'am' ? 'ግባና ሚና ቀይር' : 'Authenticate & Switch Role')}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
