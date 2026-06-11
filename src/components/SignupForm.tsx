import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import fpPromise from '@fingerprintjs/fingerprintjs';

interface SignupFormProps {
  onSignup: (user: User) => void;
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSignup, onSwitchToLogin }: SignupFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    gmail: '',
    pass: '',
    referralCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false);
  const [checkingDevice, setCheckingDevice] = useState(true);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref') || '';
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode }));
    }

    const checkDevice = async () => {
      try {
        const fp = await fpPromise.load();
        const result = await fp.get();
        setDeviceFingerprint(result.visitorId);

        // Check if this fingerprint has already registered an account
        const { data, error } = await supabase.from('device_fingerprints').select('*').eq('fingerprint', result.visitorId).single();
        
        if (data) {
          setIsDeviceBlocked(true);
          setError('এই ডিভাইস থেকে ইতিমধ্যেই একটি অ্যাকাউন্ট খোলা হয়েছে। (Device already registered)');
        }
      } catch (err) {
        console.error("Error generating fingerprint", err);
      } finally {
        setCheckingDevice(false);
      }
    };
    
    checkDevice();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDeviceBlocked || checkingDevice) return;

    if (!formData.name || !formData.number || !formData.gmail || !formData.pass) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.gmail,
        password: formData.pass,
        options: {
          data: {
            name: formData.name,
            number: formData.number,
            referralCode: formData.referralCode,
            balance: 0,
            streak: 0,
            joinedAt: new Date().toISOString(),
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (deviceFingerprint && data.user) {
        await supabase.from('device_fingerprints').insert({
          fingerprint: deviceFingerprint,
          user_id: data.user.id
        });
      }

      const newUser: User = {
        id: data.user!.id,
        name: formData.name,
        number: formData.number,
        gmail: formData.gmail,
        pass: formData.pass,
        referralCode: formData.referralCode,
        balance: 0,
        streak: 0,
        joinedAt: new Date().toISOString(),
      };
      
      onSignup(newUser);
    } catch (err: any) {
      setError(err.message || 'Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingDevice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isDeviceBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500"
        >
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-black">!</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Device Restricted</h2>
          <p className="text-slate-600 mb-6 font-medium">{error}</p>
          <button
            onClick={onSwitchToLogin}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-black transition-all"
          >
            Go to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl border border-white max-w-md w-full relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-1 tracking-tight">BDPAY</h1>
          <p className="text-slate-500 font-medium">Create your earning account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-medium p-4 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">Full Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white outline-none transition-all font-medium"
              placeholder="e.g. Rakibul Islam"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">Mobile Number</label>
            <input 
              type="tel" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white outline-none transition-all font-medium font-mono"
              placeholder="01XXXXXXXXX"
              value={formData.number}
              onChange={e => setFormData({...formData, number: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white outline-none transition-all font-medium"
              placeholder="your@gmail.com"
              value={formData.gmail}
              onChange={e => setFormData({...formData, gmail: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white outline-none transition-all font-medium tracking-widest"
              placeholder="••••••••"
              value={formData.pass}
              onChange={e => setFormData({...formData, pass: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 ml-1 flex items-center justify-between">
              <span className="flex items-center gap-2">Referral Code</span>
              <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-md leading-none">OPTIONAL</span>
            </label>
            <div className="relative">
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-emerald-50/50 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold font-mono text-emerald-800 placeholder:text-emerald-300 placeholder:font-medium"
                placeholder="Enter code"
                value={formData.referralCode}
                onChange={e => setFormData({...formData, referralCode: e.target.value})}
              />
              <div className="absolute -bottom-6 left-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-emerald-600 font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                ১২ তারিখের মধ্যে রেফার কোড দিয়ে একাউন্ট করলেই ৫০ টাকা বোনাস!
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-black transition-all mt-8 disabled:opacity-70 disabled:shadow-none"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm font-medium text-slate-500 mt-6 pt-6 border-t border-slate-100">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-primary font-bold hover:underline">
            Login
          </button>
        </p>
      </motion.div>
    </div>
  );
}
