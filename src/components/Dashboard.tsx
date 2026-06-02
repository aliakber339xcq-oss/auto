import { User } from '../types';
import { TASK_LIST } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Wallet, Flame, CheckCircle2, ChevronRight, Menu, Home, Clock, Coins, User as UserIcon, ShieldAlert, X, HelpCircle, Info, Star, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskListView } from './TaskListView';
import { AdminPanel } from './AdminPanel';
import { HistoryView } from './HistoryView';
import { SiteAgeCounter } from './SiteAgeCounter';
import { RechargeView } from './RechargeView';
import { GmailTaskView } from './GmailTaskView';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  setUser: (user: User) => void;
}

export function Dashboard({ user, onLogout, setUser }: DashboardProps) {
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [checkInMsg, setCheckInMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'withdraw' | 'account' | 'admin'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTaskCategory, setActiveTaskCategory] = useState<string | null>(null);
  const [activeTaskTitle, setActiveTaskTitle] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);
  const [isGmailView, setIsGmailView] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const isAdmin = user.gmail === 'admin@gmail.com';

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: subs } = await supabase.from('submissions').select('id, status, tasks(title), updated_at').in('status', ['approved', 'rejected']).eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3);
      const { data: recs } = await supabase.from('recharges').select('id, status, offer_details, updated_at').in('status', ['approved', 'rejected']).eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3);
      
      const notifs: any[] = [];
      if (subs) {
        notifs.push(...subs.map(s => ({ id: `task-${s.id}`, type: 'Task', title: s.tasks?.title || 'Task', status: s.status, updated_at: s.updated_at })));
      }
      if (recs) {
        notifs.push(...recs.map(r => ({ id: `rec-${r.id}`, type: 'Recharge', title: r.offer_details || 'Top Up', status: r.status, updated_at: r.updated_at })));
      }
      notifs.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setNotifications(notifs.slice(0, 5));
    };
    fetchNotifications();

    const refreshUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const metadata = data.user.user_metadata || {};
        // Make sure we correctly update streak and balance
        const updatedUser: User = {
          ...user,
          balance: metadata.balance ?? user.balance,
          streak: metadata.streak ?? user.streak,
          lastCheckIn: metadata.lastCheckIn ?? user.lastCheckIn,
        };
        // Update local state if there are changes
        if (updatedUser.balance !== user.balance || updatedUser.streak !== user.streak || updatedUser.lastCheckIn !== user.lastCheckIn) {
           setUser(updatedUser);
           localStorage.setItem('bdpay_user', JSON.stringify(updatedUser));
           localStorage.setItem('bdpay_registered_user_data', JSON.stringify(updatedUser));
        }
      }
    };
    refreshUser();
  }, [activeTab]);

  useEffect(() => {
    if (user.lastCheckIn) {
      const lastCheckInDate = new Date(user.lastCheckIn).toDateString();
      const todayDate = new Date().toDateString();
      if (lastCheckInDate === todayDate) {
        setCanCheckIn(false);
      }
    }
  }, [user.lastCheckIn]);

  const handleCheckIn = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = user.streak;
    let newBalance = user.balance;
    let message = "Checked in successfully!";

    if (user.lastCheckIn) {
      const lastDate = new Date(user.lastCheckIn);
      lastDate.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    if (newStreak === 7) {
      newBalance += 100;
      newStreak = 0; // Reset after bonus
      message = "🎉 7 Day Streak! You received a 100 BDT bonus!";
    }

    const lastCheckInStr = new Date().toISOString();
    const updatedUser = { 
      ...user, 
      lastCheckIn: lastCheckInStr,
      streak: newStreak,
      balance: newBalance
    };

    setIsUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          balance: newBalance,
          streak: newStreak,
          lastCheckIn: lastCheckInStr,
        }
      });
      
      if (!error) {
        setUser(updatedUser);
        localStorage.setItem('bdpay_user', JSON.stringify(updatedUser));
        localStorage.setItem('bdpay_registered_user_data', JSON.stringify(updatedUser));
        setCanCheckIn(false);
        setCheckInMsg(message);
        setTimeout(() => setCheckInMsg(''), 4000);
      } else {
        alert("Failed to sync check-in with server. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const startTask = (taskId: string, taskTitle: string) => {
    if (taskId === 'recharge') {
      setIsRecharging(true);
      return;
    }
    if (taskId === 'gmail') {
      setIsGmailView(true);
      return;
    }
    if (['typing', 'telegram'].includes(taskId)) {
      alert(`${taskTitle} feature will be available very soon!`);
      return;
    }
    setActiveTaskCategory(taskId);
    setActiveTaskTitle(taskTitle);
  };

  const premiumTask = TASK_LIST.find(t => t.id === 'premium');
  const rechargeTask = TASK_LIST.find(t => t.id === 'recharge');
  const regularTasks = TASK_LIST.filter(t => t.id !== 'premium' && t.id !== 'recharge');

  if (isRecharging) {
    return <RechargeView user={user} onBack={() => setIsRecharging(false)} />;
  }

  if (isGmailView) {
    return <GmailTaskView user={user} onBack={() => setIsGmailView(false)} />;
  }

  // If a task category is selected, render the TaskListView instead of the main dashboard
  if (activeTaskCategory) {
    return (
      <TaskListView 
        taskType={activeTaskCategory} 
        categoryTitle={activeTaskTitle} 
        user={user} 
        onBack={() => setActiveTaskCategory(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
           <>
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
               onClick={() => setShowNotifications(false)}
             />
             <motion.div
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="fixed bottom-0 left-0 right-0 max-h-[70vh] bg-white rounded-t-3xl z-50 shadow-2xl flex flex-col"
             >
                <div className="flex justify-between items-center p-5 border-b border-slate-100">
                   <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
                   <button onClick={() => setShowNotifications(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200">
                     <X size={20} />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                   {notifications.length === 0 ? (
                     <div className="text-center py-8 text-slate-500">
                        <Bell className="mx-auto mb-3 text-slate-300" size={32} />
                        <p>No new notifications</p>
                     </div>
                   ) : (
                     notifications.map(n => (
                       <div key={n.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-4">
                          <div className={`mt-1 p-2 rounded-full ${n.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                             {n.status === 'approved' ? <CheckCircle2 size={20} /> : <X size={20} />}
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 text-sm">
                               {n.type}: {n.title}
                             </p>
                             <p className="text-xs font-semibold mt-1">
                               Status: <span className={n.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}>{n.status.charAt(0).toUpperCase() + n.status.slice(1)}</span>
                             </p>
                             <p className="text-[10px] text-slate-400 mt-2">
                               {new Date(n.updated_at).toLocaleString()}
                             </p>
                          </div>
                       </div>
                     ))
                   )}
                </div>
             </motion.div>
           </>
        )}
      </AnimatePresence>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className="bg-primary px-6 py-8 text-white relative">
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-white shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-emerald-100 text-sm opacity-90">{user.number}</p>
              </div>

              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                <button onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'home' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Home size={20} className={activeTab === 'home' ? 'text-primary' : 'text-slate-400'} /> Dashboard
                </button>
                <button onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'history' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Clock size={20} className={activeTab === 'history' ? 'text-primary' : 'text-slate-400'} /> History
                </button>
                <button onClick={() => { setActiveTab('withdraw'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'withdraw' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Coins size={20} className={activeTab === 'withdraw' ? 'text-primary' : 'text-slate-400'} /> Withdraw
                </button>
                <button onClick={() => { setActiveTab('account'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'account' ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <UserIcon size={20} className={activeTab === 'account' ? 'text-primary' : 'text-slate-400'} /> Profile
                </button>
                
                <hr className="my-4 border-slate-100" />
                
                <button className="w-full flex items-center gap-3 p-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                  <HelpCircle size={20} className="text-slate-400" /> Support
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                  <Info size={20} className="text-slate-400" /> About Us
                </button>

                <hr className="my-4 border-slate-100" />

                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors">
                  <LogOut size={20} /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="bg-primary px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 font-extrabold bg-white/20 rounded-lg flex items-center justify-center text-sm shadow-inner">
            B
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">BDPAY</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowNotifications(true)}
            className="p-2 hover:bg-black/10 rounded-lg transition-colors relative"
          >
            <Bell size={22} />
            {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-primary"></span>}
          </button>
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 hover:bg-black/10 rounded-lg transition-colors border border-transparent hover:border-white/20"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pb-24 relative overflow-y-auto">
        {activeTab === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
            {/* Home Profile Section */}
            <div className="bg-gradient-to-b from-primary to-indigo-700 pt-6 pb-24 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
              
              <div className="max-w-md mx-auto text-white relative z-10">
                <p className="text-indigo-100 text-sm font-medium mb-1 tracking-wide uppercase">Welcome back</p>
                <div className="flex items-center">
                  <h2 className="text-3xl font-black tracking-tight">{user.name}</h2>
                  {!canCheckIn && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="flex items-center gap-1.5 bg-orange-500/20 px-3 py-1 rounded-full text-orange-300 text-xs font-bold ml-4 border border-orange-400/30 backdrop-blur-sm"
                    >
                      <Flame size={14} className="fill-orange-400 stroke-orange-400" />
                      {user.streak} Days
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto px-4 -mt-14 relative space-y-5 z-20">
              {/* Balance Card */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-6 flex flex-col sm:flex-row items-center justify-between border border-white/40 ring-1 ring-slate-100/50 backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none" />
                <div className="flex items-center gap-5 w-full relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-100/50">
                    <Wallet size={32} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 font-bold tracking-wide uppercase mb-1">Main Balance</p>
                    <p className="text-3xl font-black text-slate-800 tracking-tight">৳ {user.balance.toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>

              {/* Daily Check-In & Streak */}
              {canCheckIn && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 flex flex-col sm:flex-row gap-5 items-center justify-between"
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-50 text-orange-500 rounded-2xl flex items-center justify-center shadow-inner">
                      <Flame size={24} fill="#f97316" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-0.5">Daily Check-In</p>
                      <p className="font-black text-slate-800 text-lg">{user.streak} / 7 Days</p>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto">
                    <button
                      onClick={handleCheckIn}
                      disabled={isUpdating}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all bg-slate-900 text-white hover:bg-black shadow-[0_4px_14px_0_rgb(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                      {isUpdating ? 'Updating...' : 'Claim Reward'}
                    </button>
                  </div>
                </motion.div>
              )}
              
              {checkInMsg && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500 text-white p-4 rounded-2xl text-sm text-center font-bold shadow-lg shadow-emerald-500/20"
                >
                  {checkInMsg}
                </motion.div>
              )}

              {/* Info Banner & Age */}
              <SiteAgeCounter />

              {/* Highlighted Tasks */}
              <div className="space-y-4 pt-2">
                {rechargeTask && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => startTask(rechargeTask.id, rechargeTask.title)}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 p-1.5 rounded-[1.5rem] shadow-xl shadow-indigo-500/20 text-left group transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
                  >
                    <div className="bg-white/95 backdrop-blur-xl rounded-[1.2rem] p-5 flex items-center justify-between h-full border border-white/50">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${rechargeTask.bg} ${rechargeTask.color} shadow-inner`}>
                          <rechargeTask.icon size={28} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg tracking-wider uppercase border border-indigo-100">Top Up</span>
                            <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg tracking-wider uppercase border border-emerald-100">56৳/1000৳ Com</span>
                          </div>
                          <h3 className="font-black text-slate-800 text-xl leading-tight group-hover:text-indigo-600 transition-colors">{rechargeTask.title}</h3>
                          <p className="text-xs text-slate-500 mt-1 font-semibold">Enjoy awesome offers & cheap data packs</p>
                        </div>
                      </div>
                      <ChevronRight size={24} className="text-indigo-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                )}
              </div>

              {/* Tasks Grid */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-xl font-black text-slate-800">Earning Options</h2>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  {regularTasks.map((task, idx) => (
                    <motion.button
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + (idx * 0.05) }}
                      onClick={() => startTask(task.id, task.title)}
                      className="bg-white p-5 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100/60 flex flex-col items-start gap-4 hover:shadow-lg hover:border-slate-200 transition-all text-left group relative overflow-hidden"
                    >
                      <div className="absolute -right-6 -top-6 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-[2] transition-transform duration-700 ease-in-out z-0 opacity-50" />
                      <div className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center ${task.bg} ${task.color} shadow-inner`}>
                        <task.icon size={24} />
                      </div>
                      <div className="relative z-10 w-full mt-2">
                        <span className="font-bold text-[14px] text-slate-800 leading-snug group-hover:text-primary transition-colors block">
                          {task.title}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-1 mt-2 text-primary font-semibold text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                          Start <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Premium Task (Moved below regular tasks) */}
              {premiumTask && (
                <div className="pb-4">
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => startTask(premiumTask.id, premiumTask.title)}
                    className="w-full bg-slate-900 p-1.5 rounded-[1.5rem] shadow-xl shadow-amber-500/10 text-left group transition-all hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-0.5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 animate-pulse opacity-50" />
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-[1.2rem] p-5 flex items-center justify-between h-full relative z-10 border border-white/10">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-inner`}>
                          <Star size={28} className="fill-white" />
                        </div>
                        <div>
                          <span className="inline-block px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-lg tracking-wider uppercase mb-1.5 border border-amber-500/30">High Reward</span>
                          <h3 className="font-black text-white text-xl leading-tight group-hover:text-amber-300 transition-colors">{premiumTask.title}</h3>
                          <p className="text-xs text-slate-400 mt-1 font-medium">Complete special tasks for top payouts</p>
                        </div>
                      </div>
                      <ChevronRight size={24} className="text-amber-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && <HistoryView user={user} />}

        {activeTab === 'withdraw' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Withdraw Balance</h2>
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Available Balance</span>
              <span className="text-xl font-bold text-primary">৳ {user.balance.toFixed(2)}</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center text-slate-500">
              <Coins className="w-12 h-12 text-amber-200 mx-auto mb-3" />
              <p className="text-sm">Minimum withdrawal amount is 500 BDT.</p>
              <button disabled className="w-full mt-4 bg-slate-100 text-slate-400 py-3 rounded-xl font-medium cursor-not-allowed">
                Request Withdrawal
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'account' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto space-y-4">
            <h2 className="text-xl font-bold text-slate-800 mb-4">My Account</h2>
            
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center">
                  <UserIcon size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{user.name}</h3>
                  <p className="text-sm text-slate-500">{user.number}</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium text-slate-800">{user.gmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Joined</span>
                  <span className="font-medium text-slate-800">{new Date(user.joinedAt).toLocaleDateString()}</span>
                </div>
                {user.referralCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ref Code</span>
                    <span className="font-medium text-slate-800">{user.referralCode}</span>
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className="w-full bg-slate-800 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
              >
                <ShieldAlert size={20} />
                Admin Panel
              </button>
            )}

            <button 
              onClick={handleLogout}
              className="w-full bg-red-50 text-red-600 font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
              <LogOut size={20} />
              Log Out
            </button>
          </motion.div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel onBack={() => setActiveTab('account')} />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-4 left-0 right-0 z-30 pointer-events-none">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-xl rounded-2xl flex justify-around items-center px-1 py-1.5 pointer-events-auto">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 min-w-[64px] p-2 rounded-xl transition-all ${activeTab === 'home' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Home size={22} className={activeTab === 'home' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-bold">Home</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1 min-w-[64px] p-2 rounded-xl transition-all ${activeTab === 'history' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Clock size={22} className={activeTab === 'history' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-bold">History</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('withdraw')}
              className={`flex flex-col items-center gap-1 min-w-[64px] p-2 rounded-xl transition-all ${activeTab === 'withdraw' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Coins size={22} className={activeTab === 'withdraw' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-bold">Withdraw</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('account')}
              className={`flex flex-col items-center gap-1 min-w-[64px] p-2 rounded-xl transition-all ${activeTab === 'account' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <UserIcon size={22} className={activeTab === 'account' ? 'fill-primary/20' : ''} />
              <span className="text-[10px] font-bold">Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

