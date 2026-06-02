import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskItem, User } from '../types';
import { ArrowLeft, Clock, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import { TaskSubmitView } from './TaskSubmitView';

interface TaskListViewProps {
  taskType: string;
  categoryTitle: string;
  user: User;
  onBack: () => void;
}

export function TaskListView({ taskType, categoryTitle, user, onBack }: TaskListViewProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    loadTasks();
  }, [taskType]);

  const loadTasks = async () => {
    setLoading(true);
    
    // Fetch submissions for this user
    const { data: userSubmissions } = await supabase
      .from('submissions')
      .select('task_id, status')
      .eq('user_id', user.id);

    // Get IDs of tasks that are pending or approved
    const completedTaskIds = new Set(
      (userSubmissions || [])
        .filter(sub => sub.status === 'pending' || sub.status === 'approved')
        .map(sub => sub.task_id)
    );

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('task_type', taskType)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Filter out completed tasks
      setTasks(data.filter(task => !completedTaskIds.has(task.id)));
    }
    setLoading(false);
  };

  if (selectedTask) {
    return (
      <TaskSubmitView 
        task={selectedTask} 
        user={user} 
        onBack={() => setSelectedTask(null)}
        onSuccess={() => {
          loadTasks();
          setSelectedTask(null);
        }}
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
      <div className="bg-primary px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3 text-white">
        <button onClick={onBack} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">{categoryTitle}</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-slate-500">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p>No tasks available at the moment.</p>
          </div>
        ) : (
          tasks.map(task => (
            <motion.div
              key={task.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedTask(task)}
              className="bg-white rounded-2xl shadow-sm p-5 border border-slate-100 cursor-pointer flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-slate-800 text-lg mb-1">{task.title}</h3>
                <div className="flex items-center gap-1 xl text-emerald-600 font-medium text-sm border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex">
                  <Gift size={14} /> 
                  <span>Reward: ৳ {Number(task.reward).toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl">
                Start
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
