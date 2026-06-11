import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Submission, User, TaskItem } from '../types';
import { Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowLeft, CreditCard, ListTodo, Filter, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskSubmitView } from './TaskSubmitView';

const ITEMS_PER_PAGE = 5;

export function HistoryView({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'recharges' | 'withdrawals'>('tasks');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [page, setPage] = useState(1);
  
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState({ totalAmount: 0, totalCount: 0 });
  const [loading, setLoading] = useState(true);
  const [resubmittingTask, setResubmittingTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    setPage(1); // Reset page on tab or filter change
    if (activeTab === 'tasks') {
      loadHistory();
    } else if (activeTab === 'recharges') {
      loadRecharges();
    } else {
      loadWithdrawals();
    }
  }, [activeTab, statusFilter]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      loadHistory();
    } else if (activeTab === 'recharges') {
      loadRecharges();
    } else {
      loadWithdrawals();
    }
  }, [page]);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      // First fetch aggregate stats for approved withdrawals
      const { data: statsData } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved');
      
      if (statsData) {
        setWithdrawalStats({
            totalAmount: statsData.reduce((acc, curr) => acc + Number(curr.amount), 0),
            totalCount: statsData.length
        });
      }

      let query = supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.like('status', `${statusFilter}%`);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) console.error("loadWithdrawals error:", error);
      if (data) {
        const parsedData = data.map(w => {
           const parts = w.status.split('_');
           if (parts.length >= 2) {
             return {
                ...w,
                status: parts[0],
                method: parts[1] || 'Unknown',
                account_number: parts[2] || ''
             };
           }
           return w;
        });
        setWithdrawals(parsedData);
      }
    } catch (err) {
      console.error("loadWithdrawals failed:", err);
    }
    setLoading(false);
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('submissions')
        .select('*, tasks(*)') // Fetch all task details
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) console.error("loadHistory error:", error);
      if (data) {
        setSubmissions(data);
      }
    } catch (err) {
      console.error("loadHistory failed:", err);
    }
    setLoading(false);
  };

  const loadRecharges = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('recharges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) console.error("loadRecharges error:", error);
      if (data) {
        setRecharges(data);
      }
    } catch (err) {
      console.error("loadRecharges failed:", err);
    }
    setLoading(false);
  };

  if (resubmittingTask) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
        <div className="bg-primary px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3 text-white">
          <button onClick={() => setResubmittingTask(null)} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Resubmit Task</h1>
        </div>
        <TaskSubmitView 
          task={resubmittingTask} 
          user={user} 
          onBack={() => setResubmittingTask(null)}
          onSuccess={() => {
            loadHistory();
            setResubmittingTask(null);
          }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto pb-24">
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 min-w-max px-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'tasks' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListTodo size={18} /> Tasks
        </button>
        <button 
          onClick={() => setActiveTab('recharges')}
          className={`flex-1 min-w-max px-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'recharges' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard size={18} /> Purchases
        </button>
        <button 
          onClick={() => setActiveTab('withdrawals')}
          className={`flex-1 min-w-max px-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'withdrawals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wallet size={18} /> Withdraw
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
        <Filter size={16} className="text-slate-400 shrink-0" />
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors shrink-0 ${
              statusFilter === s ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {activeTab === 'withdrawals' && (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 mb-6 border border-indigo-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">মোট উত্তোলন</p>
            <p className="text-2xl font-black text-indigo-700 leading-none">৳{withdrawalStats.totalAmount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">সফল ট্রানজেকশন</p>
            <p className="text-2xl font-black text-indigo-700 leading-none">{withdrawalStats.totalCount} বার</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-500 font-medium animate-pulse">Loading history...</div>
      ) : activeTab === 'tasks' ? (
        submissions.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium">No tasks found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map(sub => (
              <div key={sub.id} className="bg-white rounded-3xl shadow-sm p-4 border border-slate-100 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px] mb-1">{sub.tasks?.title || 'Unknown Task'}</h3>
                    <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-md">Reward: ৳{sub.tasks?.reward}</p>
                  </div>
                  <div>
                    {sub.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-100 uppercase tracking-wide">
                        <AlertCircle size={12} /> Pending
                      </span>
                    )}
                    {sub.status === 'approved' && (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-100 uppercase tracking-wide">
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    )}
                    {sub.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-red-100 uppercase tracking-wide">
                        <XCircle size={12} /> Rejected
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                  <p className="text-[10px] font-medium text-slate-400">Date: {new Date(sub.created_at).toLocaleDateString()}</p>
                  
                  {sub.status === 'rejected' && sub.tasks && (
                    <button
                      onClick={() => setResubmittingTask(sub.tasks)}
                      className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-black transition-colors"
                    >
                      <RefreshCw size={12} /> Resubmit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'recharges' ? (
        recharges.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium">No purchases found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recharges.map(rec => (
              <div key={rec.id} className="bg-white rounded-3xl shadow-sm p-4 border border-slate-100 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px] mb-1">{rec.offer_details || 'Regular Top-Up'}</h3>
                    <p className="text-sm font-black text-indigo-600">৳{rec.amount}</p>
                  </div>
                  <div>
                    {rec.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-100 uppercase tracking-wide">
                        <AlertCircle size={12} /> Pending
                      </span>
                    )}
                    {rec.status === 'approved' && (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-100 uppercase tracking-wide">
                        <CheckCircle2 size={12} /> Success
                      </span>
                    )}
                    {rec.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-red-100 uppercase tracking-wide">
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                  <div className="flex justify-between mb-1">
                     <span className="text-slate-500 font-medium">Phone:</span>
                     <span className="font-bold text-slate-800">{rec.phone_number}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                     <span className="text-slate-500 font-medium">Operator:</span>
                     <span className="font-bold text-slate-800 uppercase">{rec.operator}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-slate-500 font-medium">TrxID:</span>
                     <span className="font-mono text-slate-600">{rec.trx_id}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                  <p className="text-[10px] font-medium text-slate-400">Date: {new Date(rec.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        withdrawals.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium">No withdrawals found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {withdrawals.map(w => (
              <div key={w.id} className="bg-white rounded-3xl shadow-sm p-4 border border-slate-100 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px] mb-1">Withdraw to {w.method}</h3>
                    <p className="text-sm font-black text-indigo-600">৳{w.amount}</p>
                  </div>
                  <div>
                    {w.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-100 uppercase tracking-wide">
                        <AlertCircle size={12} /> Pending
                      </span>
                    )}
                    {w.status === 'approved' && (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-100 uppercase tracking-wide">
                        <CheckCircle2 size={12} /> Success
                      </span>
                    )}
                    {w.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-lg text-[10px] font-bold border border-red-100 uppercase tracking-wide">
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                  <div className="flex justify-between mb-1">
                     <span className="text-slate-500 font-medium">Account:</span>
                     <span className="font-bold text-slate-800">{w.account_number}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                     <span className="text-slate-500 font-medium">Method:</span>
                     <span className="font-bold text-slate-800 uppercase">{w.method}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                  <p className="text-[10px] font-medium text-slate-400">Date: {new Date(w.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Pagination Controls */}
      {((activeTab === 'tasks' && (page > 1 || submissions.length === ITEMS_PER_PAGE)) ||
        (activeTab === 'recharges' && (page > 1 || recharges.length === ITEMS_PER_PAGE)) ||
        (activeTab === 'withdrawals' && (page > 1 || withdrawals.length === ITEMS_PER_PAGE))) && (
        <div className="flex justify-between mt-6 px-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-opacity"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-sm font-bold text-slate-400">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(activeTab === 'tasks' ? submissions.length : activeTab === 'recharges' ? recharges.length : withdrawals.length) < ITEMS_PER_PAGE}
            className="flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-opacity"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
