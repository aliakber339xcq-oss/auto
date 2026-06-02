import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Submission, User, TaskItem } from '../types';
import { Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ArrowLeft, CreditCard, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TaskSubmitView } from './TaskSubmitView';

export function HistoryView({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'recharges'>('tasks');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resubmittingTask, setResubmittingTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    if (activeTab === 'tasks') {
      loadHistory();
    } else {
      loadRecharges();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('submissions')
      .select('*, tasks(*)') // Fetch all task details
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setSubmissions(data);
    }
    setLoading(false);
  };

  const loadRecharges = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setRecharges(data);
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
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'tasks' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ListTodo size={18} /> Tasks
        </button>
        <button 
          onClick={() => setActiveTab('recharges')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'recharges' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard size={18} /> Recharges
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 font-medium">Loading history...</div>
      ) : activeTab === 'tasks' ? (
        submissions.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium">No task history available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map(sub => (
              <div key={sub.id} className="bg-white rounded-3xl shadow-sm p-5 border border-slate-100 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px] mb-1">{sub.tasks?.title || 'Unknown Task'}</h3>
                    <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-md">Reward: ৳{sub.tasks?.reward}</p>
                  </div>
                  <div>
                    {sub.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-100 uppercase tracking-wide">
                        <AlertCircle size={14} /> Pending
                      </span>
                    )}
                    {sub.status === 'approved' && (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100 uppercase tracking-wide">
                        <CheckCircle2 size={14} /> Approved
                      </span>
                    )}
                    {sub.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-100 uppercase tracking-wide">
                        <XCircle size={14} /> Rejected
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                  <p className="text-[11px] font-medium text-slate-400">Date: {new Date(sub.created_at).toLocaleDateString()}</p>
                  
                  {sub.status === 'rejected' && sub.tasks && (
                    <button
                      onClick={() => setResubmittingTask(sub.tasks)}
                      className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black transition-colors"
                    >
                      <RefreshCw size={14} /> Resubmit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        recharges.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium">No recharge history available yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recharges.map(rec => (
              <div key={rec.id} className="bg-white rounded-3xl shadow-sm p-5 border border-slate-100 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px] mb-1">{rec.offer_details || 'Regular Top-Up'}</h3>
                    <p className="text-sm font-black text-indigo-600">৳{rec.amount}</p>
                  </div>
                  <div>
                    {rec.status === 'pending' && (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-100 uppercase tracking-wide">
                        <AlertCircle size={14} /> Pending
                      </span>
                    )}
                    {rec.status === 'approved' && (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100 uppercase tracking-wide">
                        <CheckCircle2 size={14} /> Success
                      </span>
                    )}
                    {rec.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-100 uppercase tracking-wide">
                        <XCircle size={14} /> Failed
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
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
                  <p className="text-[11px] font-medium text-slate-400">Date: {new Date(rec.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </motion.div>
  );
}
