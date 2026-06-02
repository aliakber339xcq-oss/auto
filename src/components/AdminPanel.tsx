import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Submission, TaskItem } from '../types';
import { TASK_LIST } from '../data';
import { ArrowLeft, Check, X, KeySquare, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'submissions' | 'tasks' | 'keys' | 'recharges' | 'gmail'>('submissions');
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [gmailTasks, setGmailTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [keys, setKeys] = useState<{id: string, api_key: string}[]>([]);
  const [newKey, setNewKey] = useState('');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    link: '',
    tutorial_url: '',
    reward: '5',
    task_type: 'fb-reels'
  });
  const [newGmailTask, setNewGmailTask] = useState({
    first_name: '',
    last_name: '',
    email_prefix: '',
    password: '',
    reward: '5'
  });

  useEffect(() => {
    if (tab === 'submissions') loadSubmissions();
    if (tab === 'keys') loadKeys();
    if (tab === 'tasks') loadTasks();
    if (tab === 'recharges') loadRecharges();
    if (tab === 'gmail') loadGmailTasks();
  }, [tab]);

  // --------------- Gmail Tasks Logic ---------------
  const loadGmailTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('gmail_tasks').select('*').order('created_at', { ascending: false });
    if (data) setGmailTasks(data);
    setLoading(false);
  };

  const handleAddGmailTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('gmail_tasks').insert({
      first_name: newGmailTask.first_name,
      last_name: newGmailTask.last_name,
      email_prefix: newGmailTask.email_prefix,
      password: newGmailTask.password,
      reward: Number(newGmailTask.reward),
      status: 'available'
    }).select();
    
    if (data && data[0]) {
      setGmailTasks([data[0], ...gmailTasks]);
      setNewGmailTask({ first_name: '', last_name: '', email_prefix: '', password: '', reward: '5' });
    }
  };

  const handleDeleteGmailTask = async (id: string) => {
    await supabase.from('gmail_tasks').delete().eq('id', id);
    setGmailTasks(gmailTasks.filter(t => t.id !== id));
  };
  
  const handleApproveGmailTask = async (id: string, userId: string, reward: number) => {
    // Approve task
    await supabase.from('gmail_tasks').update({ status: 'approved' }).eq('id', id);
    
    // Add reward to user
    const { data: userData } = await supabase.from('users').select('balance').eq('id', userId).single();
    if (userData) {
      await supabase.from('users').update({ balance: userData.balance + reward }).eq('id', userId);
    }
    
    setGmailTasks(gmailTasks.map(t => t.id === id ? { ...t, status: 'approved' } : t));
  };

  const handleRejectGmailTask = async (id: string) => {
    // Instead of rejecting completely, just make it available again
    await supabase.from('gmail_tasks').update({ status: 'available', locked_by: null, locked_at: null }).eq('id', id);
    setGmailTasks(gmailTasks.map(t => t.id === id ? { ...t, status: 'available', locked_by: null, locked_at: null } : t));
  };

  // --------------- Recharges Logic ---------------
  const loadRecharges = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) setRecharges(data);
    setLoading(false);
  };

  const handleRechargeAction = async (id: string, action: 'approved' | 'rejected', amount: number, userId: string) => {
    // If approved, we need to deduct the balance or do whatever.
    // Actually wait, for recharge, user pays us on bKash directly, so their balance in app is unaffected.
    // Or do they use their app balance? "Recivee Number,  Oparetor, Amount Diye contiune, Then Paynent kore TRx ID dibe then" - if they pay on bKash, their app balance isn't deducted.
    // So we just update the status!
    await supabase.from('recharges').update({ status: action }).eq('id', id);
    setRecharges(recharges.filter(r => r.id !== id));
  };

  // --------------- Submissions Logic ---------------
  const loadSubmissions = async () => {
    setLoading(true);
    // Joining tasks manually since we might not have a foreign key set up cleanly for users
    const { data: subsData } = await supabase
      .from('submissions')
      .select('*, tasks(*)')
      .eq('status', 'pending');
    
    if (subsData) setSubmissions(subsData);
    setLoading(false);
  };

  const handleSubmissionAction = async (id: string, action: 'approved' | 'rejected', userId: string, reward: number) => {
    if (action === 'approved') {
      try {
        const { error } = await supabase.rpc('approve_task_submission', {
          p_submission_id: id,
          p_user_id: userId,
          p_reward: reward
        });
        
        if (error) {
          console.error("RPC Error:", error);
          await supabase.from('submissions').update({ status: action }).eq('id', id);
          alert("SQL function not found in Supabase. Please run the latest SQL from /supabase_setup.sql in your Supabase SQL editor.");
        }
      } catch (err) {
        await supabase.from('submissions').update({ status: action }).eq('id', id);
      }
    } else {
      await supabase.from('submissions').update({ status: action }).eq('id', id);
    }
    
    setSubmissions(submissions.filter(s => s.id !== id));
  };


  // --------------- API Keys Logic ---------------
  const loadKeys = async () => {
    setLoading(true);
    const { data } = await supabase.from('imgbb_keys').select('*').eq('is_active', true);
    if (data) setKeys(data);
    setLoading(false);
  };

  const addKey = async () => {
    if (!newKey) return;
    const { data, error } = await supabase.from('imgbb_keys').insert({ api_key: newKey }).select();
    if (data && data[0]) {
      setKeys([...keys, data[0]]);
      setNewKey('');
    }
  };

  const deleteKey = async (id: string) => {
    await supabase.from('imgbb_keys').update({ is_active: false }).eq('id', id);
    setKeys(keys.filter(k => k.id !== id));
  };


  // --------------- Tasks Logic ---------------
  const loadTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('tasks').insert({
      title: newTaskForm.title,
      description: newTaskForm.description,
      link: newTaskForm.link,
      tutorial_url: newTaskForm.tutorial_url,
      reward: Number(newTaskForm.reward),
      task_type: newTaskForm.task_type
    }).select();
    
    if (data && data[0]) {
      setTasks([data[0], ...tasks]);
      setNewTaskForm({...newTaskForm, title: '', description: '', link: '', tutorial_url: ''});
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    await supabase.from('tasks').update({ is_active: !currentStatus }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t));
  };


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
      <div className="bg-slate-800 px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-2xl mb-4">
          <button 
            onClick={() => setTab('submissions')}
            className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center ${tab === 'submissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Proofs
          </button>
          <button 
            onClick={() => setTab('recharges')}
            className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center ${tab === 'recharges' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Recharges
          </button>
          <button 
            onClick={() => setTab('gmail')}
            className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center ${tab === 'gmail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Gmail
          </button>
          <button 
            onClick={() => setTab('tasks')}
            className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center ${tab === 'tasks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tasks
          </button>
          <button 
            onClick={() => setTab('keys')}
            className={`py-2 px-1 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center ${tab === 'keys' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Keys
          </button>
        </div>


        {/* Submissions Tab */}
        {tab === 'submissions' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Pending Proofs</h2>
            {loading ? <p className="text-slate-500">Loading...</p> : submissions.length === 0 ? <p className="text-slate-500">No pending submissions.</p> : submissions.map(sub => (
              <div key={sub.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800">{sub.tasks?.title || 'Unknown Task'}</h3>
                    <p className="text-xs text-slate-500">Reward: ৳{sub.tasks?.reward}</p>
                    <p className="text-xs text-slate-500 mt-1">User ID: {sub.user_id?.slice(0, 8)}...</p>
                  </div>
                </div>
                
                <a href={sub.screenshot_url} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 font-medium text-sm hover:underline">
                  View Screenshot Proof
                </a>
                
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => handleSubmissionAction(sub.id, 'approved', sub.user_id, sub.tasks?.reward || 0)} className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg font-medium flex justify-center items-center gap-1 hover:bg-emerald-100">
                    <Check size={18} /> Approve
                  </button>
                  <button onClick={() => handleSubmissionAction(sub.id, 'rejected', sub.user_id, sub.tasks?.reward || 0)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-medium flex justify-center items-center gap-1 hover:bg-red-100">
                    <X size={18} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recharges Tab */}
        {tab === 'recharges' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Pending Recharges</h2>
            {loading ? <p className="text-slate-500">Loading...</p> : recharges.length === 0 ? <p className="text-slate-500">No pending recharges.</p> : recharges.map(rec => (
              <div key={rec.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{rec.offer_details || 'Regular Top-Up'}</h3>
                    <p className="text-sm font-black text-indigo-600">Amount: ৳{rec.amount}</p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(rec.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm space-y-2">
                  <p><span className="text-slate-500 font-medium">Phone:</span> <span className="font-bold">{rec.phone_number}</span></p>
                  <p><span className="text-slate-500 font-medium">Operator:</span> <span className="font-bold uppercase">{rec.operator}</span></p>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-medium block mb-1">bKash/Nagad TrxID:</span> 
                    <span className="font-mono bg-indigo-50 text-indigo-700 p-2 rounded block break-all font-bold border border-indigo-100">
                      {rec.trx_id}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => handleRechargeAction(rec.id, 'approved', rec.amount, rec.user_id)}
                    className="flex-1 bg-emerald-100 text-emerald-700 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-200 font-bold transition-colors"
                  >
                    <Check size={18} /> Approve
                  </button>
                  <button 
                    onClick={() => handleRechargeAction(rec.id, 'rejected', rec.amount, rec.user_id)}
                    className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-red-200 font-bold transition-colors"
                  >
                    <X size={18} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gmail Tasks Tab */}
        {tab === 'gmail' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" /> Add Gmail Task
              </h2>
              <form onSubmit={handleAddGmailTask} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">First Name</label>
                    <input required type="text" value={newGmailTask.first_name} onChange={e => setNewGmailTask({...newGmailTask, first_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label>
                    <input required type="text" value={newGmailTask.last_name} onChange={e => setNewGmailTask({...newGmailTask, last_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email Prefix</label>
                  <input required type="text" value={newGmailTask.email_prefix} onChange={e => setNewGmailTask({...newGmailTask, email_prefix: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="johndoe123" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                  <input required type="text" value={newGmailTask.password} onChange={e => setNewGmailTask({...newGmailTask, password: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="StrongPass123!" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Reward (BDT)</label>
                  <input required type="number" step="0.1" value={newGmailTask.reward} onChange={e => setNewGmailTask({...newGmailTask, reward: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                  Add Gmail Task
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Gmail Tasks</h2>
              {loading ? <p className="text-slate-500">Loading...</p> : gmailTasks.length === 0 ? <p className="text-slate-500">No gmail tasks.</p> : gmailTasks.map(task => (
                <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800">{task.first_name} {task.last_name}</h3>
                      <p className="text-sm text-slate-500">{task.email_prefix}@gmail.com</p>
                      <p className="text-xs font-mono text-slate-400 mt-1">Pass: {task.password}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          task.status === 'available' ? 'bg-emerald-100 text-emerald-700' :
                          task.status === 'locked' ? 'bg-amber-100 text-amber-700' :
                          task.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                       }`}>
                         {task.status}
                       </span>
                       <button onClick={() => handleDeleteGmailTask(task.id)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                  
                  {task.status === 'submitted' && task.locked_by && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button 
                        onClick={() => handleApproveGmailTask(task.id, task.locked_by, task.reward)}
                        className="flex-1 bg-emerald-100 text-emerald-700 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleRejectGmailTask(task.id)}
                        className="flex-1 bg-red-100 text-red-700 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Add New Task</h2>
              <form onSubmit={addTask} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                  <select 
                    value={newTaskForm.task_type} 
                    onChange={e => setNewTaskForm({...newTaskForm, task_type: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    {TASK_LIST.filter(t => !['gmail', 'recharge', 'typing', 'telegram'].includes(t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Task Title</label>
                  <input required type="text" value={newTaskForm.title} onChange={e => setNewTaskForm({...newTaskForm, title: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Watch Video & Subscribe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Description (Optional)</label>
                  <textarea value={newTaskForm.description} onChange={e => setNewTaskForm({...newTaskForm, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Task details..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Link URL</label>
                  <input required type="url" value={newTaskForm.link} onChange={e => setNewTaskForm({...newTaskForm, link: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tutorial Image/Video URL (Optional)</label>
                  <input type="url" value={newTaskForm.tutorial_url} onChange={e => setNewTaskForm({...newTaskForm, tutorial_url: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="URL of tutorial video or image..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Reward (BDT)</label>
                  <input required type="number" step="0.1" value={newTaskForm.reward} onChange={e => setNewTaskForm({...newTaskForm, reward: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg flex justify-center items-center gap-2 hover:bg-slate-700">
                  <Plus size={18} /> Add Task
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-800">Existing Tasks</h3>
              {tasks.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{t.title}</h4>
                    <p className="text-xs text-slate-500">[{t.task_type}] - ৳{t.reward}</p>
                  </div>
                  <button 
                    onClick={() => toggleTask(t.id, t.is_active)}
                    className={`px-3 py-1 text-xs font-medium rounded-full ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {t.is_active ? 'Active' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {tab === 'keys' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <KeySquare size={20} className="text-indigo-500" />
                Add ImgBB API Key
              </h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                  placeholder="Paste api key here..." 
                />
                <button onClick={addKey} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Add</button>
              </div>
              <p className="text-xs text-slate-500 mt-3">The app will use these keys to upload screenshots. If one fails, it tries the next.</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 mb-2">Active Keys</h3>
              {loading ? <p className="text-slate-500">Loading...</p> : keys.length === 0 ? <p className="text-slate-500">No keys added yet.</p> : keys.map(k => (
                <div key={k.id} className="bg-white px-4 py-3 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="font-mono text-xs text-slate-600 truncate mr-4">{k.api_key}</span>
                  <button onClick={() => deleteKey(k.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}
