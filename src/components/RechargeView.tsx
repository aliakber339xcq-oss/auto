import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { CreditCard, CheckCircle2, ChevronRight, Phone, Smartphone, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

const OPERATORS = [
  { id: 'gp', name: 'Grameenphone', color: 'bg-blue-500' },
  { id: 'robi', name: 'Robi', color: 'bg-red-500' },
  { id: 'banglalink', name: 'Banglalink', color: 'bg-orange-500' },
  { id: 'airtel', name: 'Airtel', color: 'bg-pink-500' },
  { id: 'teletalk', name: 'Teletalk', color: 'bg-green-500' },
];

const OFFERS = [
  { id: 1, operator: 'gp', title: 'Monthly Data Pack', desc: '30GB Internet + 800 Min', price: 499 },
  { id: 2, operator: 'gp', title: 'Weekly Pack', desc: '10GB Internet + 200 Min', price: 198 },
  { id: 3, operator: 'robi', title: 'Monthly Bundle', desc: '40GB Internet + 1000 Min', price: 549 },
  { id: 4, operator: 'banglalink', title: 'Super Saver', desc: '50GB Internet + 1500 Min', price: 599 },
  { id: 5, operator: 'airtel', title: 'Youth Pack', desc: '20GB Internet + 500 Min', price: 299 },
];

export function RechargeView({ user, onBack }: { user: User, onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [operator, setOperator] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<{title: string, desc: string} | null>(null);
  const [trxId, setTrxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleContinue = () => {
    if (!phone || !operator || !amount) {
      setError('Please fill in all details (Phone, Operator, Amount/Offer).');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSelectOffer = (offer: any) => {
    setOperator(offer.operator);
    setAmount(offer.price.toString());
    setSelectedOffer({ title: offer.title, desc: offer.desc });
  };

  const handleSubmitRecharge = async () => {
    if (!trxId) {
      setError('Please provide a valid Transaction ID.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: dbError } = await supabase.from('recharges').insert({
      user_id: user.id,
      phone_number: phone,
      operator: operator,
      amount: Number(amount),
      offer_details: selectedOffer ? `${selectedOffer.title} - ${selectedOffer.desc}` : 'Regular Top-Up',
      trx_id: trxId
    });

    setLoading(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto pt-10 pb-24 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Request Submitted!</h2>
        <p className="text-slate-500 mb-8">Your top-up / package recharge request is pending admin approval.</p>
        <button 
          onClick={onBack}
          className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          Back to Dashboard
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-24">
      <div className="bg-primary px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3 text-white">
        <button onClick={step === 2 ? () => setStep(1) : onBack} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Top Up & Offers</h1>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
              <h2 className="font-bold text-slate-800 mb-4">Recharge Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="tel" 
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Operator</label>
                  <div className="grid grid-cols-5 gap-2">
                    {OPERATORS.map(op => (
                      <button
                        key={op.id}
                        onClick={() => setOperator(op.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border ${operator === op.id ? `bg-slate-900 border-slate-900 text-white shadow-md` : `bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100`} transition-all`}
                        title={op.name}
                      >
                        <Smartphone size={20} />
                        <span className="text-[10px] font-bold uppercase truncate w-full text-center">{op.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Amount (৳)</label>
                  <input 
                    type="number" 
                    placeholder="Enter Custom Amount"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setSelectedOffer(null); }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                  {selectedOffer && (
                    <p className="text-xs text-emerald-600 font-bold mt-2 bg-emerald-50 p-2 rounded-lg inline-block border border-emerald-100">
                      ✓ Selected: {selectedOffer.title}
                    </p>
                  )}
                </div>
              </div>

              <button 
                onClick={handleContinue}
                className="w-full mt-6 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-colors"
              >
                Continue to Payment
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-slate-100 p-5">
               <h2 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                 Special Offers
                 <span className="bg-rose-100 text-rose-600 text-[10px] uppercase font-black px-2 py-0.5 rounded-lg border border-rose-200">Hot Deals</span>
               </h2>
               
               <div className="space-y-3">
                 {OFFERS.map(offer => {
                   const op = OPERATORS.find(o => o.id === offer.operator);
                   return (
                     <div key={offer.id} className="border border-slate-100 rounded-2xl p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer bg-slate-50 group" onClick={() => handleSelectOffer(offer)}>
                        <div className="flex justify-between items-start mb-2">
                           <div>
                             <span className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase text-white rounded-md mb-1 ${op?.color}`}>{op?.name}</span>
                             <h3 className="font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">{offer.title}</h3>
                           </div>
                           <div className="bg-slate-900 text-white font-black px-3 py-1 rounded-lg text-sm shadow-sm group-hover:bg-primary transition-colors">
                             ৳{offer.price}
                           </div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">{offer.desc}</p>
                     </div>
                   )
                 })}
               </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              
              <h2 className="font-bold text-indigo-900 mb-2 relative z-10">Payment Instructions</h2>
              <div className="text-sm text-indigo-800 space-y-2 relative z-10 relative z-10">
                <p>1. Send exactly <strong className="text-lg">৳{amount}</strong> to our bKash/Nagad Merchant Number.</p>
                <div className="bg-white/80 p-3 rounded-xl border border-indigo-200 font-mono text-center font-bold text-slate-800">
                  017XX-XXXXXX (Personal)
                </div>
                <p>2. Copy the Transaction ID from the bKash/Nagad app.</p>
                <p>3. Paste the TrxID below to confirm your top-up request.</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Transaction ID (TrxID)</label>
              <input 
                type="text" 
                placeholder="Ex: 8A4F9X..."
                value={trxId}
                onChange={e => setTrxId(e.target.value)}
                className="w-full px-4 py-3 outline-none whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono"
              />
              
              <button 
                onClick={handleSubmitRecharge}
                disabled={loading}
                className="w-full mt-5 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
