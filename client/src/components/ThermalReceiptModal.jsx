import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer, X, CheckCircle2, QrCode } from 'lucide-react';

export default function ThermalReceiptModal({ ticket, items, settings, lang = 'en', onClose }) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    // Generate Telebirr Payment QR string
    const telebirrPayload = `telebirr://pay?merchant=${settings?.telebirr_merchant_code || '884920'}&amount=${ticket?.total_amount || 0}&ref=${ticket?.ticket_number || 'SB-001'}`;
    QRCode.toDataURL(telebirrPayload, { width: 140, margin: 1 }, (err, url) => {
      if (!err && url) {
        setQrUrl(url);
      }
    });
  }, [ticket, settings]);

  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  const isAmharic = lang === 'am';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-slate-100 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2 mb-4 text-emerald-400">
          <CheckCircle2 size={24} />
          <h2 className="text-xl font-bold">
            {isAmharic ? 'ክፍያው በተሳካ ሁኔታ ተጠናቋል!' : 'Transaction Completed!'}
          </h2>
        </div>

        {/* The Printable 58mm Thermal Receipt Box */}
        <div 
          id="thermal-receipt" 
          className="bg-white text-slate-900 p-5 rounded-lg font-mono text-xs shadow-inner mx-auto w-full max-w-[320px] border border-slate-300"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt="Logo" 
                className="w-10 h-10 object-contain mx-auto mb-1.5 rounded-lg" 
              />
            ) : null}
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-black">
              {isAmharic 
                ? (settings?.shop_name_amharic || settings?.shop_name || 'SmartBarber')
                : (settings?.shop_name || 'SmartBarber')}
            </h3>
            {(settings?.branch_name || settings?.branch_name_amharic) && (
              <p className="text-[11px] font-bold text-slate-800">
                {isAmharic 
                  ? (settings?.branch_name_amharic || settings?.branch_name)
                  : (settings?.branch_name || settings?.branch_name_amharic)}
              </p>
            )}
            <p className="text-[10px] text-slate-700">
              {isAmharic 
                ? (settings?.address_amharic || settings?.address || 'Addis Ababa, Ethiopia')
                : (settings?.address || 'Addis Ababa, Ethiopia')}
            </p>
            {settings?.phone && (
              <p className="text-[10px] text-slate-700">
                Tel: {settings.phone}
              </p>
            )}
            <div className="mt-2 inline-block px-2 py-0.5 bg-slate-200 text-black font-bold rounded text-[10px]">
              {isAmharic ? 'ይፋዊ ደረሰኝ' : 'OFFICIAL SALES RECEIPT'}
            </div>
          </div>

          {/* Meta Info */}
          <div className="border-b border-dashed border-slate-400 pb-2 mb-2 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Ticket #:</span>
              <span className="font-bold">{ticket.ticket_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Date:</span>
              <span>{new Date(ticket.created_at || Date.now()).toLocaleDateString('en-GB')} {new Date(ticket.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Barber:</span>
              <span className="font-bold">{ticket.barber_name || ticket.barber_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Customer:</span>
              <span>{ticket.customer_name || 'Walk-in'}</span>
            </div>
          </div>

          {/* Itemized Services */}
          <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
            <div className="flex justify-between font-bold text-slate-800 mb-1 border-b border-slate-300 pb-1">
              <span>Item / Service</span>
              <span>ETB</span>
            </div>
            {items && items.map((item, idx) => (
              <div key={idx} className="flex justify-between py-0.5 text-[11px]">
                <span className="truncate pr-2">{item.service_name || item.name}</span>
                <span className="font-medium whitespace-nowrap">{item.price} ETB</span>
              </div>
            ))}
          </div>

          {/* Totals & Payment Method */}
          <div className="space-y-1 pt-1 pb-3 border-b border-dashed border-slate-400 text-[11px]">
            {ticket.tip_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tip:</span>
                <span>+{ticket.tip_amount} ETB</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-300">
              <span>TOTAL:</span>
              <span>{ticket.total_amount} ETB</span>
            </div>
            <div className="flex justify-between text-slate-700 pt-1 font-semibold">
              <span>Payment:</span>
              <span className="uppercase text-blue-800 font-bold">{ticket.payment_method}</span>
            </div>
            {ticket.telebirr_tx_id && (
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Tx ID:</span>
                <span className="font-mono">{ticket.telebirr_tx_id}</span>
              </div>
            )}
          </div>

          {/* Telebirr QR & Merchant Box */}
          <div className="pt-3 text-center flex flex-col items-center">
            {qrUrl && (
              <div className="bg-white p-1 rounded border border-slate-300 mb-1 inline-block">
                <img src={qrUrl} alt="Telebirr QR" className="w-24 h-24" />
              </div>
            )}
            <p className="text-[10px] font-bold text-slate-800">
              Telebirr Merchant Code: {settings?.telebirr_merchant_code || '884920'}
            </p>
            <p className="text-[9px] text-slate-600 mt-1">
              {isAmharic ? 'ስለመረጡን እናመሰግናለን! በድጋሚ ይምጡ!' : 'Thank you for your visit! Come again!'}
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">Powered by SmartBarber ET</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Printer size={18} />
            {isAmharic ? 'ደረሰኝ አትም (Print)' : 'Print (58mm)'}
          </button>
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            {isAmharic ? 'ዝጋ' : 'Done / Next Cut'}
          </button>
        </div>
      </div>
    </div>
  );
}
