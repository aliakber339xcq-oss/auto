import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User, MessageSquare, Send, Image as ImageIcon, ChevronLeft, Bot, EyeOff, Archive } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminInbox() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [hiddenChats, setHiddenChats] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('admin_hidden_chats');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [archivedChats, setArchivedChats] = useState<string[]>(() => {
    const saved = localStorage.getItem('admin_archived_chats');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('admin_hidden_chats', JSON.stringify(hiddenChats));
  }, [hiddenChats]);

  useEffect(() => {
    localStorage.setItem('admin_archived_chats', JSON.stringify(archivedChats));
  }, [archivedChats]);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeUserId) {
      loadMessages(activeUserId);
    }
  }, [activeUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    // Get distinct user_ids from support_chats (this is a bit tricky without a proper view, 
    // but we can just fetch all recent messages and group on client for small scale, 
    // or use a distinct rpc, but let's just group on client)
    const { data: allChats } = await supabase.from('support_chats').select('user_id, created_at, text').order('created_at', { ascending: false }).limit(1000);
    if (allChats) {
       // Also fetch user profiles so we have names/numbers
       const { data: usersData } = await supabase.from('user_profiles').select('user_id, name, number, my_referral_code');
       
       const userMap = new Map((usersData || []).map(u => [u.user_id, u]));

       const map = new Map();
       for (const chat of allChats) {
         if (!map.has(chat.user_id)) {
           const profile = userMap.get(chat.user_id) || {} as any;
           map.set(chat.user_id, {
             user_id: chat.user_id,
             last_message: chat.text,
             last_time: chat.created_at,
             name: profile.name || 'Unknown User',
             number: profile.number || 'No Number'
           });
         }
       }
       setConversations(Array.from(map.values()));
    }
  };

  const loadMessages = async (userId: string) => {
    const { data } = await supabase.from('support_chats').select('*').eq('user_id', userId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e?: React.FormEvent, imageUrl?: string) => {
    if (e) e.preventDefault();
    if (!text.trim() && !imageUrl || !activeUserId) return;

    const messageText = text;
    setText('');

    // Optimistic UI
    const newMessage = {
      id: Date.now().toString(),
      user_id: activeUserId,
      sender_type: 'admin',
      text: messageText,
      image_url: imageUrl || null,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);

    await supabase.from('support_chats').insert({
      user_id: activeUserId,
      sender_type: 'admin',
      text: messageText,
      image_url: imageUrl || null
    });
    
    // Automatically unhide if admin replies (optional, we could also just leave it unhidden since it's active)
    loadConversations();
  };

  const handleHide = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    setHiddenChats(prev => ({ ...prev, [userId]: new Date().toISOString() }));
  };

  const handleArchive = (e: React.MouseEvent, userId: string) => {
    e.stopPropagation();
    if (window.confirm('আপনি কি নিশ্চিত যে আপনি এই চ্যাটটি আর্কাইভ করতে চান? তারা আবার মেসেজ দিলেও এটি আর ইনবক্সে আসবে না।')) {
      setArchivedChats(prev => [...prev, userId]);
    }
  };

  const visibleConversations = conversations.filter(conv => {
    if (archivedChats.includes(conv.user_id)) return false;
    if (hiddenChats[conv.user_id]) {
      const hideTime = new Date(hiddenChats[conv.user_id]).getTime();
      const messageTime = new Date(conv.last_time).getTime();
      if (messageTime <= hideTime) {
        return false;
      }
    }
    return true;
  });

  if (!activeUserId) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
           <MessageSquare size={18} className="text-indigo-600" />
           User Inboxes
        </h3>
        
        {visibleConversations.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 text-slate-500 text-sm border border-dashed border-slate-200">
            <MessageSquare size={24} className="mx-auto mb-2 text-slate-300" />
            No incoming messages yet
          </div>
        ) : (
          <div className="space-y-3">
            {visibleConversations.map(conv => (
              <button 
                key={conv.user_id}
                onClick={() => setActiveUserId(conv.user_id)}
                className="w-full text-left p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all flex items-center gap-4 group shadow-sm hover:shadow relative"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl shadow-inner flex items-center justify-center font-black tracking-widest text-sm uppercase group-hover:scale-105 transition-transform">
                     {conv.name.substring(0, 2)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-800 text-sm truncate pr-20">{conv.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 pr-16">
                    <span className="text-[10px] font-bold bg-slate-200 px-1.5 py-0.5 rounded-md text-slate-600 shrink-0">{conv.number}</span>
                    <p className="text-xs text-slate-500 truncate flex-1">{conv.last_message}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-end">
                   <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap mb-1">
                      {new Date(conv.last_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                   </span>
                   <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div 
                       onClick={(e) => handleHide(e, conv.user_id)}
                       className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-amber-100 hover:text-amber-600 transition-colors"
                       title="Hide until new message"
                     >
                       <EyeOff size={14} />
                     </div>
                     <div 
                       onClick={(e) => handleArchive(e, conv.user_id)}
                       className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                       title="Archive permanently"
                     >
                       <Archive size={14} />
                     </div>
                   </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[600px] max-h-[70vh]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 rounded-t-3xl">
         <div className="flex items-center gap-3">
             <button onClick={() => setActiveUserId(null)} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors">
                <ChevronLeft size={18} />
             </button>
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs uppercase shadow-inner">
                    {conversations.find(c => c.user_id === activeUserId)?.name.substring(0, 2) || 'U'}
                 </div>
                 <div>
                    <h3 className="font-black text-slate-800 text-sm">
                       {conversations.find(c => c.user_id === activeUserId)?.name || 'User'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400">
                       {conversations.find(c => c.user_id === activeUserId)?.number || 'No Number'}
                    </p>
                 </div>
             </div>
         </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'} mb-2`}>
            {msg.sender_type === 'user' && (
               <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex flex-col items-center justify-center shrink-0 mr-2 shadow-inner font-black text-[10px] uppercase">
                  {conversations.find(c => c.user_id === activeUserId)?.name.substring(0, 2) || 'U'}
               </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${msg.sender_type === 'admin' ? 'bg-[#0088cc] text-white rounded-br-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm'}`}>
              {msg.image_url && (
                <div className="mb-2 rounded-xl overflow-hidden border border-white/10">
                   <img src={msg.image_url} alt="attachment" className="w-full max-h-48 object-cover" />
                </div>
              )}
              {msg.text && (
                <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              )}
              <div className={`text-[10px] mt-1 font-bold ${msg.sender_type === 'admin' ? 'text-white/60' : 'text-slate-400'} flex justify-end`}>
                 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-slate-100 flex flex-col gap-2">
         {/* Simple text input, image upload logic could be added similar to user side if requested */}
         <div className="flex items-end gap-2">
            <textarea 
               value={text}
               onChange={e => setText(e.target.value)}
               onKeyDown={e => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSend();
                 }
               }}
               placeholder="Write a message as Admin..."
               className="flex-1 max-h-32 min-h-[44px] bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none py-3"
               rows={1}
            />
            <button 
               onClick={() => handleSend()}
               disabled={!text.trim()}
               className="p-3 bg-[#0088cc] text-white rounded-xl disabled:opacity-50 shrink-0 hover:bg-[#0077b3] transition-colors"
            >
               <Send size={20} />
            </button>
         </div>
      </div>
    </div>
  );
}
