import { User } from '../types';
import { TASK_LIST } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Wallet, Flame, CheckCircle2, ChevronRight, Menu, Home, Clock, Coins, User as UserIcon, ShieldAlert, X, HelpCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskListView } from './TaskListView';
import { AdminPanel } from './AdminPanel';
import { HistoryView } from './HistoryView';

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

  const isAdmin = user.gmail === 'admin@gmail.com';

  useEffect(() => {
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
    if (['gmail', 'recharge', 'typing', 'telegram'].includes(taskId)) {
      alert(`${taskTitle} feature will be available very soon!`);
      return;
    }
    setActiveTaskCategory(taskId);
    setActiveTaskTitle(taskTitle);
  };

  const premiumTask = TASK_LIST.find(t => t.id === 'premium');
  const rechargeTask = TASK_LIST.find(t => t.id === 'recharge');
  const regularTasks = TASK_LIST.filter(t => t.id !== 'premium' && t.id !== 'recharge');

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
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 hover:bg-black/10 rounded-lg transition-colors border border-transparent hover:border-white/20"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pb-24 relative overflow-y-auto">
        {activeTab === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
            {/* Home Profile Section */}
            <div className="bg-primary pt-4 pb-20 px-6 rounded-b-[2.5rem] shadow-sm relative">
              <div className="max-w-md mx-auto text-white">
                <p className="text-emerald-100 text-sm font-medium mb-1">Welcome back,</p>
                <div className="flex items-center">
              <h2 className="text-2xl font-bold">{user.name}</h2>
              {!canCheckIn && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="flex items-center gap-1 bg-orange-500/20 px-2.5 py-0.5 rounded-full text-orange-400 text-xs font-bold ml-3 border border-orange-400/20"
                >
                  <Flame size={14} className="fill-orange-400 stroke-orange-400" />
                  {user.streak} Days
                </motion.div>
              )}
            </div>
              </div>
            </div>

            <div className="max-w-md mx-auto px-4 -mt-12 relative space-y-6">
              {/* Balance Card */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-2xl shadow-md p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-primary rounded-xl flex items-center justify-center">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Main Balance</p>
                    <p className="text-2xl font-bold text-slate-800">৳ {user.balance.toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>

              {/* Daily Check-In & Streak */}
              {canCheckIn && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row gap-4 items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center">
                      <Flame size={20} fill="#f97316" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Current Streak</p>
                      <p className="font-bold text-slate-800">{user.streak} / 7 Days</p>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto text-right">
                    <button
                      onClick={handleCheckIn}
                      disabled={isUpdating}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors bg-primary text-white hover:bg-primary-dark shadow-sm"
                    >
                      {isUpdating ? 'Updating...' : 'Check In Now'}
                    </button>
                  </div>
                </motion.div>
              )}
              
              {checkInMsg && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 text-green-700 p-3 rounded-lg text-sm text-center font-medium border border-green-100"
                >
                  {checkInMsg}
                </motion.div>
              )}

              {/* Info Banner */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                <p className="text-sm text-indigo-800 font-medium flex items-center justify-center gap-2">
                  🚀 Site Officially Launched: <span className="font-bold">27 March 2026</span>
                </p>
              </div>

              {/* Highlighted Tasks */}
              <div className="space-y-3">
                {rechargeTask && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => startTask(rechargeTask.id, rechargeTask.title)}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 p-1 rounded-2xl shadow-md text-left group transition-all hover:shadow-lg"
                  >
                    <div className="bg-white/95 backdrop-blur-sm rounded-[14px] p-4 flex items-center justify-between h-full">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rechargeTask.bg} ${rechargeTask.color} shadow-inner`}>
                          <rechargeTask.icon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-md tracking-wide uppercase">Top Up</span>
                            <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-md tracking-wide uppercase">56৳/1000৳ Com</span>
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{rechargeTask.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5 font-medium">Enjoy awesome offers & cheap data packs</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-indigo-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                )}

                {premiumTask && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => startTask(premiumTask.id, premiumTask.title)}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 p-1 rounded-2xl shadow-md text-left group transition-all hover:shadow-lg"
                  >
                    <div className="bg-white/95 backdrop-blur-sm rounded-[14px] p-4 flex items-center justify-between h-full">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${premiumTask.bg} ${premiumTask.color} shadow-inner`}>
                          <premiumTask.icon size={24} />
                        </div>
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md mb-1 tracking-wide uppercase">High Reward</span>
                          <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-amber-600 transition-colors">{premiumTask.title}</h3>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-amber-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                )}
              </div>

              {/* Tasks Grid */}
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-4 px-1 mt-2">More Earning Options</h2>
                <div className="grid grid-cols-2 gap-3">
                  {regularTasks.map((task, idx) => (
                    <motion.button
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + (idx * 0.05) }}
                      onClick={() => startTask(task.id, task.title)}
                      className="bg-white p-4 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 flex flex-col items-start gap-3 hover:shadow-md hover:border-slate-200 transition-all text-left group relative overflow-hidden"
                    >
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0" />
                      <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center ${task.bg} ${task.color}`}>
                        <task.icon size={20} />
                      </div>
                      <div className="relative z-10 w-full flex items-center justify-between mt-1">
                        <span className="font-semibold text-[13px] text-slate-700 leading-tight group-hover:text-primary transition-colors pr-2">
                          {task.title}
                        </span>
                        <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
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

