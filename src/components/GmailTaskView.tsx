import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ArrowLeft, Clock, Copy, CheckCircle2, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function GmailTaskView({ user, onBack }: { user: User, onBack: () => void }) {
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkExistingTask();
  }, []);

  useEffect(() => {
    let timer: number;
    if (task && !success) {
      // calculate time left
      const updateTimer = () => {
        const lockedAt = new Date(task.locked_at).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((3600000 - (now - lockedAt)) / 1000);
        
        if (diff <= 0) {
          setTimeLeft(0);
          setError('Time expired. Task has been unlocked.');
          setTask(null);
        } else {
          setTimeLeft(diff);
        }
      };
      updateTimer();
      timer = window.setInterval(updateTimer, 1000);
    }
    return () => window.clearInterval(timer);
  }, [task, success]);

  const checkExistingTask = async () => {
    setLoading(true);
    // Check if user already has a locked task
    const { data: existing } = await supabase
      .from('gmail_tasks')
      .select('*')
      .eq('locked_by', user.id)
      .eq('status', 'locked')
      .order('locked_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
       // Check if it's expired
       const lockedAt = new Date(existing[0].locked_at).getTime();
       const now = new Date().getTime();
       if (now - lockedAt > 3600000) {
         // Expired, unlock it
         await supabase.from('gmail_tasks').update({ status: 'available', locked_by: null, locked_at: null }).eq('id', existing[0].id);
       } else {
         setTask(existing[0]);
       }
    }
    setLoading(false);
  };

  const reserveTask = async () => {
    setLoading(true);
    setError('');
    
    // First, find an available task (or one that is locked but expired)
    // Supabase RPC or we can do client side (less safe but OK for prototypes)
    const thirtyGo = new Date(Date.now() - 3600000).toISOString();
    
    // Try to get available
    const { data: availableData, error: err } = await supabase
      .from('gmail_tasks')
      .select('*')
      .eq('status', 'available')
      .limit(1);

    let targetTask = availableData && availableData[0];
    
    if (!targetTask) {
       // Check if there are expired locked tasks
       const { data: expiredData } = await supabase
         .from('gmail_tasks')
         .select('*')
         .eq('status', 'locked')
         .lt('locked_at', thirtyGo)
         .limit(1);
         
       if (expiredData && expiredData[0]) {
         targetTask = expiredData[0];
       }
    }

    if (targetTask) {
       // Lock it
       const now = new Date().toISOString();
       const { data: updated, error: lockErr } = await supabase
         .from('gmail_tasks')
         .update({ status: 'locked', locked_by: user.id, locked_at: now })
         .eq('id', targetTask.id)
         .select();
         
       if (updated && updated[0]) {
         setTask(updated[0]);
       } else {
         setError('Failed to lock task. Please try again.');
       }
    } else {
       setError('No Gmail tasks are currently available. Please check back later.');
    }
    
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  const submitTask = async () => {
    if (!task) return;
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase
      .from('gmail_tasks')
      .update({ status: 'submitted' })
      .eq('id', task.id);
      
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto pt-10 pb-24 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
        <p className="text-slate-500 mb-8">Your Gmail creation has been submitted and is pending admin approval.</p>
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
        <button onClick={onBack} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Gmail Task</h1>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <Loader2 className="animate-spin mb-2" size={24} />
            Checking available tasks...
          </div>
        ) : !task ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center space-y-4">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <PlayCircle size={32} />
             </div>
             <h2 className="text-xl font-bold text-slate-800">Create Gmail Account</h2>
             <p className="text-sm text-slate-500">
               Lock a task to get started. You will be provided with a First Name, Last Name, Email Prefix, and Password. 
               You will have <strong className="text-slate-700">1 hour</strong> to create the account and submit.
               <br/><br/>If you do not submit within 1 hour, the task will be unlocked for others.
             </p>
             <button 
               onClick={reserveTask}
               className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all flex justify-center mt-4"
             >
               Find & Lock Task
             </button>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 text-center flex flex-col items-center justify-center shadow-sm">
                <div className="flex items-center gap-2 text-amber-700 font-bold mb-1 uppercase tracking-wider text-xs">
                   <Clock size={16} /> Time Remaining
                </div>
                <div className="text-4xl font-black text-amber-600 font-mono tracking-tight">
                   {formatTime(timeLeft)}
                </div>
             </div>
             
             <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">Account Details</h3>
                
                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">First Name</label>
                   <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="font-bold text-slate-800">{task.first_name}</span>
                      <button onClick={() => copyToClipboard(task.first_name)} className="text-indigo-600 bg-indigo-50 p-1.5 rounded-lg hover:bg-indigo-100"><Copy size={16}/></button>
                   </div>
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Last Name</label>
                   <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="font-bold text-slate-800">{task.last_name}</span>
                      <button onClick={() => copyToClipboard(task.last_name)} className="text-indigo-600 bg-indigo-50 p-1.5 rounded-lg hover:bg-indigo-100"><Copy size={16}/></button>
                   </div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Prefix</label>
                   <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="font-bold text-slate-800">{task.email_prefix}</span>
                      <button onClick={() => copyToClipboard(task.email_prefix)} className="text-indigo-600 bg-indigo-50 p-1.5 rounded-lg hover:bg-indigo-100"><Copy size={16}/></button>
                   </div>
                </div>
                
                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                   <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                      <span className="font-bold text-slate-800 font-mono">{task.password}</span>
                      <button onClick={() => copyToClipboard(task.password)} className="text-indigo-600 bg-indigo-50 p-1.5 rounded-lg hover:bg-indigo-100"><Copy size={16}/></button>
                   </div>
                </div>
                
                <div className="pt-2 text-sm text-slate-500 font-medium">
                  Create a new Gmail account using exactly these details. Once the account is created successfully without phone verification (or skip), click Submit.
                </div>
             </div>

             <button 
               onClick={submitTask}
               disabled={submitting}
               className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:shadow-none mt-4"
             >
               {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
               I Have Created the Account
             </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
