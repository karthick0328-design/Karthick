'use client';

import React, { useState } from 'react';
import { Conversation, User } from '@/lib/types';
import {
    Search,
    Plus,
    MessageSquare,
    Users,
    Hash,
    Briefcase,
    Filter,
    MoreVertical,
    Pin
} from 'lucide-react';
// import { format } from 'date-fns'; // Need to check if date-fns is installed, if not will use native Intl

// Fallback date formatter if date-fns not strictly required or installed
const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

interface ChatSidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    currentUser: User | null;
    isLoading: boolean;
    onCreateGroup: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
    conversations,
    activeConversationId,
    onSelectConversation,
    currentUser,
    isLoading,
    onCreateGroup
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'direct' | 'group' | 'project'>('all');

    const filteredConversations = conversations.filter(c => {
        const matchesSearch = (c.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        // Check if it's a project chat (either explicit type or a group chat with project ID/naming)
        const isProjectChat = c.type === 'project' || (c.type === 'group' && (c.relatedId || c.name?.startsWith('PRJ')));

        const matchesType =
            (filterType === 'all' && c.type !== 'direct') ||
            (filterType === 'project' && isProjectChat) ||
            (filterType === 'group' && (c.type === 'service' || c.type === 'department' || (c.type === 'group' && !isProjectChat)));

        return matchesSearch && matchesType;
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'project': return <Briefcase className="w-5 h-5 text-purple-500" />;
            case 'direct': return <MessageSquare className="w-5 h-5 text-blue-500" />;
            case 'service': return <Hash className="w-5 h-5 text-green-500" />;
            case 'department': return <Users className="w-5 h-5 text-orange-500" />;
            default: return <Hash className="w-5 h-5 text-gray-500" />;
        }
    };

    const getConversationName = (conv: Conversation) => {
        if (conv.type === 'direct') {
            // Find the other user
            const otherMember = conv.members.find(m => {
                if (!m.userId) return false;
                if (typeof m.userId === 'string') return m.userId !== currentUser?._id;
                return m.userId._id !== currentUser?._id;
            });
            // Safety check if populated
            if (otherMember && typeof otherMember.userId !== 'string') {
                return otherMember.userId.name;
            }
            return 'Direct Message';
        }
        return conv.name || 'Unnamed Group';
    };

    return (
        <div className="w-full h-full bg-white flex flex-col font-sans">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Messages</h2>
                        <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-widest">Project & Team Hub</p>
                    </div>
                    <button
                        onClick={onCreateGroup}
                        className="w-10 h-10 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center group"
                        title="New Chat"
                    >
                        <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-gray-700 placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex p-4 gap-2 bg-white/50 overflow-x-auto no-scrollbar scroll-smooth">
                {['all', 'project', 'group'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type as any)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl capitalize whitespace-nowrap transition-all duration-200 ${filterType === type
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                            : 'bg-white text-gray-600 border border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                            }`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-6">
                {isLoading ? (
                    <div className="p-4 space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="animate-pulse flex gap-3">
                                <div className="w-14 h-14 bg-gray-100 rounded-2xl"></div>
                                <div className="flex-1 space-y-3 py-1">
                                    <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                                    <div className="h-3 bg-gray-100 rounded-full w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                            <MessageSquare className="w-10 h-10 text-gray-300" />
                        </div>
                        <h4 className="text-gray-900 font-bold mb-1">No chats found</h4>
                        <p className="text-gray-500 text-xs">Try a different search or filter</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredConversations.map((conv) => {
                            const isActive = conv._id === activeConversationId;
                            const name = getConversationName(conv);
                            // Handle Last Message
                            let lastMsgContent = "No messages yet";
                            let lastMsgTime = "";
                            if (conv.lastMessage) {
                                if (typeof conv.lastMessage === 'object' && 'content' in conv.lastMessage) {
                                    lastMsgContent = conv.lastMessage.isSystemMessage
                                        ? `System: ${conv.lastMessage.content}`
                                        : (conv.lastMessage.senderId === currentUser?._id ? 'You: ' : '') + conv.lastMessage.content;
                                }
                            }
                            if (conv.lastMessageAt) {
                                lastMsgTime = formatDate(conv.lastMessageAt);
                            }

                            return (
                                <button
                                    key={conv._id}
                                    onClick={() => onSelectConversation(conv._id)}
                                    className={`w-full p-3.5 flex gap-4 rounded-2xl transition-all duration-200 text-left group relative border border-transparent ${isActive
                                        ? 'bg-gradient-to-r from-indigo-50 to-white border-indigo-100 shadow-sm'
                                        : 'hover:bg-gray-50/80 hover:border-gray-100'
                                        }`}
                                >
                                    <div className={`relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${isActive
                                        ? 'bg-indigo-600 text-white shadow-indigo-100 ring-4 ring-white'
                                        : 'bg-white border border-gray-100 group-hover:shadow-md text-gray-500 transition-all duration-300'
                                        }`}>
                                        <div className={isActive ? 'text-white' : ''}>
                                            {getIcon(conv.type)}
                                        </div>
                                        {/* Status Glow for active type */}
                                        {isActive && (
                                            <div className="absolute -inset-1 opacity-20 blur-lg bg-indigo-500 rounded-full" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`text-sm font-extrabold truncate tracking-tight ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{name}</span>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider opacity-60 ml-2 whitespace-nowrap ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>{lastMsgTime}</span>
                                        </div>

                                        <p className={`text-xs truncate leading-normal ${isActive ? 'text-indigo-700 font-semibold italic' : 'text-gray-500 font-medium'
                                            } ${conv.unreadCount && conv.unreadCount > 0 ? 'text-gray-900 font-bold' : ''}`}>
                                            {lastMsgContent}
                                        </p>
                                    </div>

                                    {/* Unread Badge */}
                                    {conv.unreadCount && conv.unreadCount > 0 && !isActive ? (
                                        <div className="flex-shrink-0 self-center">
                                            <span className="flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full ring-2 ring-white shadow-sm">
                                                {conv.unreadCount}
                                            </span>
                                        </div>
                                    ) : null}

                                    {/* Active Indicator Bar */}
                                    {isActive && (
                                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 rounded-r-full shadow-[0_0_12px_rgba(79,70,229,0.5)]" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: transparent;
                    border-radius: 10px;
                }
                .flex-1:hover .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default ChatSidebar;
