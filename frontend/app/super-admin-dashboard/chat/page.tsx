'use client';

import React from 'react';
import { 
  MessageSquare, 
  ArrowUpRight, 
  Search, 
  Users, 
  Calendar,
  Filter,
  Download,
  Share2,
  PieChart,
  ClipboardList,
  AlertCircle,
  Clock,
  Briefcase,
  Layers,
  CheckCircle,
  Cpu,
  Globe,
  ShieldCheck,
  Zap,
  Activity,
  Send,
  MoreVertical,
  Paperclip,
  Smile,
  ImageIcon,
  Loader2
} from 'lucide-react';
import axios from 'axios';

export default function GlobalChatPage() {
  const [channels, setChannels] = React.useState<any[]>([]);
  const [messages, setMessages] = React.useState<any[]>([]);
  const [activeChannel, setActiveChannel] = React.useState<any>(null);
  const [newMessage, setNewMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchChannels = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/all-conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setChannels(response.data.data);
          if (response.data.data.length > 0) {
            setActiveChannel(response.data.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching channels:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, []);

  React.useEffect(() => {
    if (!activeChannel) return;
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${activeChannel._id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setMessages(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    fetchMessages();
  }, [activeChannel]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChannel) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${activeChannel._id}/messages`, 
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setMessages([...messages, response.data.data]);
        setNewMessage('');
      }
    } catch (error) {
       console.error('Error sending message:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-14rem)] flex gap-10">
      <div className="w-[400px] flex flex-col overflow-hidden bg-white rounded-[40px] border border-slate-100 shadow-2xl group/sidebar">
        <div className="bg-indigo-600 px-8 py-6 flex justify-between items-center">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black text-white tracking-tight uppercase">Messages</h2>
            <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Real-time chat and communication</p>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/10 group-hover/sidebar:rotate-12 transition-transform">
            <MessageSquare size={18} />
          </div>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
             <input type="text" placeholder="Search conversations..." className="pl-10 pr-6 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all focus:ring-4 focus:ring-indigo-100 focus:border-indigo-200 shadow-sm w-full" />
          </div>
          <div className="space-y-4">
            {channels.map((channel, idx) => (
              <div 
                key={idx} 
                onClick={() => setActiveChannel(channel)}
                className={`group cursor-pointer p-5 transition-all shadow-sm hover:shadow-xl rounded-[32px] border overflow-hidden relative ${activeChannel?._id === channel._id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-50 hover:border-indigo-100'}`}
              >
                  <div className="flex items-center gap-4 relative">
                      <div className={`w-12 h-12 rounded-2.5xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform ${activeChannel?._id === channel._id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-indigo-600'}`}>
                         <MessageSquare size={20} />
                      </div>
                      <div className="flex flex-col gap-1">
                          <span className={`text-xs font-black uppercase tracking-tight ${activeChannel?._id === channel._id ? 'text-indigo-950' : 'text-slate-900'}`}>{channel.name || 'Group Chat'}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${activeChannel?._id === channel._id ? 'text-indigo-600' : 'text-slate-400'}`}><div className={`w-1.5 h-1.5 rounded-full ${activeChannel?._id === channel._id ? 'bg-indigo-600' : 'bg-emerald-500'}`} /> {channel.type}</span>
                      </div>
                      <div className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black border ${activeChannel?._id === channel._id ? 'bg-white text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          <Users size={10} /> {channel.members?.length || 0}
                      </div>
                  </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[48px] border border-slate-100 shadow-2xl flex flex-col overflow-hidden relative group/main">
          <div className="px-10 py-8 bg-slate-950 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 ring-4 ring-white/5 group-hover/main:scale-105 group-hover/main:rotate-6 transition-transform">
                      <Zap size={24} className="animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                      <h3 className="text-xl font-black text-white tracking-tight leading-none uppercase">Active Chat</h3>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1.5">Messaging with the team</p>
                  </div>
              </div>
              <div className="flex items-center gap-6">
                  <div className="flex -space-x-4">
                      {[1,2,3,4].map(i => (
                          <div key={i} className="w-10 h-10 bg-indigo-900 border-[3px] border-slate-950 rounded-2xl flex items-center justify-center text-[10px] font-black text-white hover:-translate-y-3 transition-all cursor-pointer shadow-lg">
                              U{i}
                          </div>
                      ))}
                      <div className="w-10 h-10 bg-white/10 border-[3px] border-slate-950 rounded-2xl flex items-center justify-center text-[10px] font-black text-indigo-400 hover:-translate-y-3 transition-all cursor-pointer">+8</div>
                  </div>
                  <button className="p-3.5 bg-white/5 border border-white/10 rounded-[20px] text-white/40 hover:text-indigo-400 hover:bg-white/10 transition-all">
                      <MoreVertical size={20} />
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-slate-50/20 custom-scrollbar">
             {messages.map((msg, idx) => {
                const isMe = msg.senderId?._id === localStorage.getItem('userId');
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                      <div className={`max-w-[70%] space-y-3`}>
                          {!isMe && (
                             <div className="flex items-center gap-3 ml-2">
                                 <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{msg.senderId?.name}</span>
                                 <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-indigo-100">{msg.senderId?.role}</span>
                             </div>
                          )}
                          <div className={`p-6 rounded-[32px] text-[13px] font-medium leading-relaxed shadow-xl ${isMe ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100' : 'bg-white text-slate-900 rounded-tl-none border border-slate-100 shadow-slate-200/50'}`}>
                             {msg.content}
                          </div>
                          <p className={`text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ${isMe ? 'justify-end mr-2' : 'ml-2'}`}>
                              <Clock size={10} className="text-indigo-400" /> {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {isMe && <CheckCircle size={10} className="text-emerald-500" />}
                          </p>
                      </div>
                  </div>
                );
             })}
          </div>

          <div className="p-10 border-t border-slate-100 bg-white shadow-[0_-16px_48px_-8px_rgba(79,70,229,0.06)] relative overflow-hidden group/input">
              <div className="p-5 bg-slate-50 border-2 border-slate-100 rounded-[32px] flex items-center gap-5 ring-8 ring-transparent group-focus-within/input:ring-indigo-50/50 group-focus-within/input:border-indigo-100 transition-all font-black">
                  <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                    <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm">
                        <Smile size={18} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm">
                        <ImageIcon size={18} />
                    </button>
                    <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm">
                        <Paperclip size={18} />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Type your message here..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-transparent border-none outline-none text-[11px] font-black text-slate-900 uppercase tracking-widest placeholder:text-slate-300" 
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-5 bg-indigo-600 text-white rounded-2.5xl shadow-2xl shadow-indigo-200 hover:bg-slate-950 transition-all hover:scale-105 active:scale-95 group-hover/input:rotate-6 flex items-center justify-center"
                  >
                      <Send size={20} />
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
}
