import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, CheckCircle2, Users, Gift, Trophy, Activity, Medal } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ReferralView({ user, onBack }: { user: User, onBack: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showCopied, setShowCopied] = useState(false);
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

  const handleCopy = () => {
    if (profile?.my_referral_code) {
      navigator.clipboard.writeText(profile.my_referral_code);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const claimBonus = async (milestone: number, bonusAmount: number) => {
    const { data, error } = await supabase.rpc('claim_referral_bonus', { p_milestone: milestone, p_bonus: bonusAmount });
    if (data === true) {
      alert(`🎉 You claimed the ৳${bonusAmount} bonus!`);
      fetchReferralData();
    } else {
      alert('Cannot claim bonus yet or already claimed.');
    }
  };

  const totalRefs = profile ? profile.total_referrals : 0;
  const claimedBonuses = profile?.bonuses_claimed || [];

  return (
    <motion.div 
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto pb-safe"
    >
      <div className="bg-indigo-600 rounded-b-[2rem] pt-safe px-5 pb-10 shadow-lg text-white sticky top-0 z-10 w-full max-w-md mx-auto">
        <div className="flex items-center gap-4 py-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Refer & Earn</h1>
        </div>
        
        <div className="mt-4 text-center">
           <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
             <Gift size={32} />
           </div>
           <h2 className="text-3xl font-black mb-1">৳15 <span className="text-lg font-medium text-indigo-200">per invite</span></h2>
           <p className="text-indigo-100 text-sm">Share your code and earn a bonus for each friend who joins!</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6">
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 relative">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Users size={18} className="text-indigo-500" /> Your Referral Code</h3>
          {loading ? (
            <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
          ) : (
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2">
              <div className="flex-1 font-mono font-bold text-lg text-slate-800 flex items-center px-3 tracking-widest">
                {profile?.my_referral_code || 'Loading...'}
              </div>
              <button onClick={handleCopy} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${showCopied ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white'}`}>
                {showCopied ? <><CheckCircle2 size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Medal size={18} className="text-indigo-500" /> Goal Bonuses</h3>
          <p className="text-xs text-slate-500 mb-4">You have referred <span className="font-bold text-indigo-600">{totalRefs}</span> users.</p>
          
          <div className="space-y-4">
            <MilestoneCard milestone={25} bonus={100} current={totalRefs} claimed={claimedBonuses.includes('25')} onClaim={() => claimBonus(25, 100)} />
            <MilestoneCard milestone={50} bonus={200} current={totalRefs} claimed={claimedBonuses.includes('50')} onClaim={() => claimBonus(50, 200)} />
            <MilestoneCard milestone={100} bonus={1000} current={totalRefs} claimed={claimedBonuses.includes('100')} onClaim={() => claimBonus(100, 1000)} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity size={18} className="text-indigo-500" /> Recent Invites</h3>
           {loading ? (
             <p className="text-slate-500 text-sm">Loading...</p>
           ) : history.length === 0 ? (
             <p className="text-slate-500 text-sm italic text-center py-4 bg-slate-50 rounded-xl">No invites yet.</p>
           ) : (
             <div className="space-y-3">
               {history.slice(0, 5).map((h, i) => (
                 <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                   <div>
                     <div className="font-bold text-sm text-slate-800">{h.referred_name || 'Unknown User'}</div>
                     <div className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString()}</div>
                   </div>
                   <div className="font-bold text-emerald-600 text-sm">+৳{h.reward_amount}</div>
                 </div>
               ))}
             </div>
           )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-10">
           <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Trophy size={18} className="text-amber-500" /> Leaderboard</h3>
           {loading ? (
             <p className="text-slate-500 text-sm">Loading...</p>
           ) : leaderboard.length === 0 ? (
             <p className="text-slate-500 text-sm">No leaders yet.</p>
           ) : (
             <div className="space-y-4">
               {leaderboard.map((leader, i) => (
                 <div key={i} className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-amber-50/50 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                     {i + 1}
                   </div>
                   <div className="flex-1 font-bold text-sm text-slate-700">{leader.name}</div>
                   <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{leader.total_referrals} refs</div>
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

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative overflow-hidden">
      <div className="flex justify-between items-end mb-2 relative z-10">
        <div>
          <div className="font-bold text-sm text-slate-700">{milestone} Referrals</div>
          <div className="text-xs text-slate-500 font-medium">Extra Bonus: <span className="text-emerald-600 font-bold">৳{bonus}</span></div>
        </div>
        <div>
          {claimed ? (
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-lg">CLAIMED</span>
          ) : isComplete ? (
            <button onClick={onClaim} className="text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1 rounded-lg shadow-sm transition-colors uppercase tracking-widest">Claim</button>
          ) : (
            <span className="text-xs font-bold text-slate-400">{current}/{milestone}</span>
          )}
        </div>
      </div>
      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden relative z-10">
        <div className={`h-full transition-all duration-500 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
