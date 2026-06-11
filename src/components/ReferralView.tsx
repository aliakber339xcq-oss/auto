import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, CheckCircle2, Users, Gift, Trophy, Activity, Medal, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ReferralView({ user, onBack }: { user: User, onBack: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showCopiedCode, setShowCopiedCode] = useState(false);
  const [showCopiedLink, setShowCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReferralData = async () => {
    setLoading(true);
    
    // Get own profile
    const { data: prof } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
    if (prof) setProfile(prof);

    // Get referral history
    const { data: refs } = await supabase.from('referrals')
      .select('created_at, reward_amount, referred_user_id')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });
      
    if (refs && refs.length > 0) {
      // Fetch names separately since join might fail on auth.users
      const userIds = refs.map(r => r.referred_user_id);
      const { data: profiles } = await supabase.from('user_profiles').select('user_id, name').in('user_id', userIds);
      
      const enrichedRefs = refs.map(r => ({
        ...r,
        referred_name: profiles?.find(p => p.user_id === r.referred_user_id)?.name || 'Unknown User'
      }));
      setHistory(enrichedRefs);
    } else {
      setHistory([]);
    }

    // Get leaderboard
    const { data: leaders } = await supabase.from('user_profiles')
      .select('name, total_referrals')
      .order('total_referrals', { ascending: false })
      .limit(10);
      
    if (leaders) setLeaderboard(leaders);

    setLoading(false);
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  const handleCopyCode = () => {
    if (profile?.my_referral_code) {
      navigator.clipboard.writeText(profile.my_referral_code);
      setShowCopiedCode(true);
      setTimeout(() => setShowCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (profile?.my_referral_code) {
      const refLink = `${window.location.origin}?ref=${profile.my_referral_code}`;
      navigator.clipboard.writeText(refLink);
      setShowCopiedLink(true);
      setTimeout(() => setShowCopiedLink(false), 2000);
    }
  };

  const claimBonus = async (milestone: number, bonusAmount: number) => {
    const { data, error } = await supabase.rpc('claim_referral_bonus', { p_milestone: milestone, p_bonus: bonusAmount });
    if (data === true) {
      alert(`🎉 আপনি ৳${bonusAmount} বোনাস পেয়েছেন!`);
      fetchReferralData();
    } else {
      alert('এখনও বোনাস ক্লেইম করার সময় হয়নি অথবা আগে নেওয়া হয়েছে।');
    }
  };

  const totalRefs = profile ? profile.total_referrals : 0;
  const claimedBonuses = profile?.bonuses_claimed || [];

  return (
    <motion.div 
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[#FAFAFA] z-50 overflow-y-auto pb-safe"
    >
      <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-b-[2.5rem] pt-safe px-5 pb-12 shadow-[0_10px_30px_rgba(79,70,229,0.3)] text-white sticky top-0 z-10 w-full max-w-md mx-auto">
        <div className="flex items-center gap-4 py-4">
          <button onClick={onBack} className="p-2 hover:bg-white/20 bg-white/10 rounded-full transition-colors backdrop-blur-sm">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-wide">রেফার করুন ও আয় করুন</h1>
        </div>
        
        <div className="mt-4 text-center">
           <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-inner border border-white/20">
             <Gift size={40} className="text-amber-300" />
           </div>
           <h2 className="text-4xl font-black mb-2 flex justify-center items-center gap-2">
             ৳১৫ <span className="text-lg font-bold text-indigo-200 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-xl">প্রতি রেফারে</span>
           </h2>
           <p className="text-indigo-100/80 text-sm font-medium mt-3 px-4 leading-relaxed">আপনার কোড শেয়ার করুন এবং বন্ধুদের জয়েন করিয়ে লাইফটাইম সুযোগ পান!</p>

           <div className="mt-5 bg-amber-400/20 border border-amber-400/30 p-3 rounded-xl backdrop-blur-sm mx-2">
             <p className="text-amber-100 text-xs font-bold leading-tight">
               🎉 অফার: ১২ তারিখের মধ্যে আপনার কোড দিয়ে কেউ একাউন্ট করলেই সে পাবে <span className="text-amber-300 font-black">৳৫০ বোনাস!</span>
             </p>
           </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-5">
        
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><Users size={18} className="text-indigo-500" /> আপনার রেফারেল অ্যাক্সেস</h3>
          {loading ? (
            <div className="h-12 bg-slate-100 rounded-xl animate-pulse mb-3"></div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2">
                <div className="flex-1 font-mono font-bold text-lg text-slate-800 flex items-center px-3 tracking-widest">
                  {profile?.my_referral_code || 'Loading...'}
                </div>
                <button onClick={handleCopyCode} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${showCopiedCode ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white'}`}>
                  {showCopiedCode ? <><CheckCircle2 size={16} /> কপিড</> : <><Copy size={16} /> কোড</>}
                </button>
              </div>

              <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2">
                <div className="flex-1 font-mono text-xs text-slate-500 flex items-center px-3 truncate overflow-hidden whitespace-nowrap">
                  {`${window.location.origin}?ref=${profile?.my_referral_code || ''}`}
                </div>
                <button onClick={handleCopyLink} className={`px-3 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${showCopiedLink ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-800 text-white'}`}>
                  {showCopiedLink ? <><CheckCircle2 size={16} /> কপিড</> : <><LinkIcon size={16} /> লিংক</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <h3 className="font-black text-slate-800 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide"><Medal size={20} className="text-indigo-500" /> টার্গেট রিওয়ার্ডস</h3>
          <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl mb-5 flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
               <span className="text-rose-600 font-bold text-lg">{totalRefs}</span>
             </div>
             <div>
               <p className="text-xs font-bold text-slate-600">আপনার মোট ইনভাইট</p>
               <p className="text-[10px] text-slate-500 mt-0.5">টার্গেট পূরণ করে এক্সট্রা বোনাস নিন</p>
             </div>
          </div>
          
          <div className="space-y-4">
            <MilestoneCard milestone={25} bonus={100} current={totalRefs} claimed={claimedBonuses.includes('25')} onClaim={() => claimBonus(25, 100)} />
            <MilestoneCard milestone={50} bonus={200} current={totalRefs} claimed={claimedBonuses.includes('50')} onClaim={() => claimBonus(50, 200)} />
            <MilestoneCard milestone={100} bonus={1000} current={totalRefs} claimed={claimedBonuses.includes('100')} onClaim={() => claimBonus(100, 1000)} />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
           <h3 className="font-black text-slate-800 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide"><Activity size={20} className="text-indigo-500" /> রিসেন্ট ইনভাইট</h3>
           {loading ? (
             <div className="animate-pulse space-y-3">
                <div className="h-10 bg-slate-100 rounded-xl"></div>
                <div className="h-10 bg-slate-100 rounded-xl"></div>
             </div>
           ) : history.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
               <span className="bg-white p-3 rounded-full mb-2 shadow-sm"><Users size={20} className="text-slate-400" /></span>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Empty History</p>
             </div>
           ) : (
             <div className="space-y-3">
               {history.slice(0, 5).map((h, i) => (
                 <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-lg text-slate-400 shadow-sm">
                       {h.referred_name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                       <div className="font-bold text-sm text-slate-800">{h.referred_name || 'Unknown User'}</div>
                       <div className="text-[10px] text-slate-400 font-medium">{new Date(h.created_at).toLocaleDateString()}</div>
                     </div>
                   </div>
                   <div className="font-black text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-lg text-sm">+৳{h.reward_amount}</div>
                 </div>
               ))}
             </div>
           )}
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 mb-10">
           <h3 className="font-black text-slate-800 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide"><Trophy size={20} className="text-amber-500" /> লিডারবোর্ড</h3>
           {loading ? (
             <div className="animate-pulse space-y-3">
                <div className="h-12 bg-slate-100 rounded-xl"></div>
                <div className="h-12 bg-slate-100 rounded-xl"></div>
             </div>
           ) : leaderboard.length === 0 ? (
             <p className="text-slate-500 text-sm">কোনো ডেটা নেই।</p>
           ) : (
             <div className="space-y-3">
               {leaderboard.map((leader, i) => (
                 <div key={i} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shadow-inner border-2 border-white ${
                     i === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-amber-200' : 
                     i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-slate-200' : 
                     i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-orange-200' : 
                     'bg-white text-slate-500'
                   }`}>
                     {i === 0 && <Trophy size={14} className="mb-0.5" />}
                     {i !== 0 && (i + 1)}
                   </div>
                   <div className="flex-1 font-bold text-sm text-slate-700">{leader.name}</div>
                   <div className="text-[11px] font-black tracking-widest text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-lg shadow-sm border border-indigo-50">
                     {leader.total_referrals} REFER
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </motion.div>
  );
}

function MilestoneCard({ milestone, bonus, current, claimed, onClaim }: { milestone: number, bonus: number, current: number, claimed: boolean, onClaim: () => void }) {
  const percent = Math.min(100, Math.round((current / milestone) * 100));
  const isComplete = current >= milestone;
  
  const [animatedPercent, setAnimatedPercent] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercent(percent);
    }, 100);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <div className="bg-[#fafafa] rounded-2xl p-4 border border-slate-200 relative overflow-hidden shadow-inner mb-4 last:mb-0">
      <div className="flex justify-between items-end mb-3 relative z-10">
        <div>
          <div className="font-black text-slate-800 text-lg">{milestone} <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">রেফারেলস</span></div>
          <div className="text-xs text-slate-500 font-medium mt-1">এক্সট্রা বোনাস: <span className="text-emerald-600 font-black">৳{bonus}</span></div>
        </div>
        <div>
          {claimed ? (
            <span className="text-[10px] font-black text-white bg-indigo-500 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-[0_2px_10px_rgba(99,102,241,0.4)]">কালেক্টেড</span>
          ) : isComplete ? (
            <button onClick={onClaim} className="text-[10px] font-black text-white bg-emerald-500 hover:scale-105 active:scale-95 px-4 py-1.5 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.4)] transition-all uppercase tracking-widest">কালেক্ট</button>
          ) : (
            <div className="text-center bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
               <span className="text-xs font-black text-slate-700">{current}</span>
               <span className="text-[10px] font-bold text-slate-400">/{milestone}</span>
            </div>
          )}
        </div>
      </div>
      <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden relative z-10 shadow-inner">
        <div className={`h-full transition-all duration-1000 ease-out shadow-inner ${isComplete ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`} style={{ width: `${animatedPercent}%` }}></div>
      </div>
    </div>
  );
}
