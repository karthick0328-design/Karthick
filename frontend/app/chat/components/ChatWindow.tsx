'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message, User, Attachment } from '@/lib/types';
import MessageBubble from './MessageBubble';
import { Send, Paperclip, MoreHorizontal, Phone, Video, Info, ArrowLeft, Loader2, Smile, Mic, X } from 'lucide-react';

interface ChatWindowProps {
    conversation: Conversation;
    messages: Message[];
    currentUser: User | null;
    onSendMessage: (content: string, attachments: Attachment[]) => Promise<void>;
    onAction: (messageId: string, actionDetails: any) => void;
    isLoading?: boolean;
    onBack?: () => void; // For mobile
}

const ChatContextBadge = ({ conversation }: { conversation: Conversation }) => {
    if (conversation.type === 'project' && conversation.contextStringValue) {
        return (
            <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs font-bold border border-purple-200 shadow-sm">
                📋 {conversation.contextStringValue}
            </span>
        );
    }
    return null;
};

const ChatWindow: React.FC<ChatWindowProps> = ({
    conversation,
    messages,
    currentUser,
    onSendMessage,
    onAction,
    isLoading,
    onBack
}) => {
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, conversation._id]);

    const handleSend = async () => {
        if ((!inputText.trim()) || isSending) return;

        setIsSending(true);
        try {
            await onSendMessage(inputText, []);
            setInputText('');
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getConversationName = () => {
        if (!currentUser) return 'Chat';
        if (conversation.type === 'direct') {
            const other = conversation.members.find(m => {
                const uid = typeof m.userId === 'string' ? m.userId : m.userId._id;
                return uid !== currentUser._id;
            });
            if (other && typeof other.userId !== 'string') return other.userId.name;
            return 'Direct Message';
        }
        return conversation.name || 'Group Chat';
    };

    return (
        <div className="flex flex-col h-full bg-white relative font-sans">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] sticky top-0 z-20">
                <div className="px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="md:hidden p-2.5 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-2xl transition-all"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}

                        <div className="relative group cursor-pointer">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-white flex items-center justify-center text-white font-black shadow-xl shadow-indigo-100 text-xl overflow-hidden group-hover:scale-105 transition-transform duration-300">
                                {getConversationName().charAt(0).toUpperCase()}
                                <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                            </div>
                            {/* Online Status */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full shadow-sm">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="font-extrabold text-gray-900 text-xl tracking-tight leading-none">{getConversationName()}</h2>
                                <ChatContextBadge conversation={conversation} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Online Now</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div
                            onClick={() => setIsMembersModalOpen(true)}
                            className="hidden lg:flex items-center gap-1.5 mr-4 px-4 py-2 bg-gray-50 hover:bg-white hover:shadow-sm cursor-pointer rounded-2xl border border-gray-100 transition-all duration-300"
                        >
                            <div className="flex -space-x-2">
                                {conversation.members?.slice(0, 3).map((m, i) => {
                                    const name = typeof m.userId === 'object' ? m.userId.name : '?';
                                    return (
                                        <div
                                            key={i}
                                            className="w-7 h-7 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[8px] font-black text-indigo-600 uppercase"
                                            title={name}
                                        >
                                            {name.charAt(0)}
                                        </div>
                                    );
                                })}
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight"> {conversation.members?.length || 0} Members</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Members Modal */}
            {isMembersModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">Team Members</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{conversation.members?.length || 0} participants in total</p>
                            </div>
                            <button
                                onClick={() => setIsMembersModalOpen(false)}
                                className="p-2.5 rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all shadow-sm"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                {conversation.members?.map((member, idx) => {
                                    const user = typeof member.userId === 'object' ? member.userId : null;
                                    const isMe = user?._id === currentUser?._id;

                                    return (
                                        <div key={idx} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
                                                {user?.name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-extrabold text-gray-900 truncate tracking-tight">{user?.name || 'Unknown User'}</p>
                                                    {isMe && <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-100">You</span>}
                                                </div>
                                                <div className="flex items-center gap-1.5 opacity-60">
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{user?.role || 'Member'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">{user?.service || user?.department || 'Participant'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${member.role === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
                                                    }`}>
                                                    {member.role}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">End of participant list</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-100">
                <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center h-full">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-indigo-600 animate-pulse" />
                            </div>
                        </div>
                        <p className="mt-6 text-sm text-gray-400 font-bold uppercase tracking-widest animate-pulse">Synchronizing</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-w-5xl mx-auto relative z-10">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] rotate-12 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-200">
                                    <Send className="w-10 h-10 text-white -rotate-12" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Break the ice!</h3>
                                <p className="text-gray-500 text-sm max-w-xs leading-relaxed font-medium">
                                    No messages here yet. Be the first to start the conversation by sending a message below.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                {messages.map((msg, index) => (
                                    <MessageBubble
                                        key={`${msg._id || 'msg'}-${index}`}
                                        message={msg}
                                        isCurrentUser={
                                            msg.senderId && currentUser
                                                ? (typeof msg.senderId === 'string'
                                                    ? msg.senderId === currentUser._id
                                                    : msg.senderId._id === currentUser._id)
                                                : false
                                        }
                                        previousMessage={index > 0 ? messages[index - 1] : undefined}
                                        onAction={onAction}
                                    />
                                ))}
                                <div ref={messagesEndRef} className="h-4" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Message Composer */}
            <div className="p-6 bg-white border-t border-gray-100 relative z-10">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-gray-50/80 backdrop-blur-sm border border-gray-200/60 rounded-[2rem] flex items-end p-2 gap-2 focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-8 focus-within:ring-indigo-500/5 transition-all duration-300 shadow-sm">

                        <div className="flex items-center pl-2 pb-1.5 gap-1">
                            {/* Attachment Button */}
                            <button
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-white rounded-full transition-all duration-200"
                                onClick={() => fileInputRef.current?.click()}
                                title="Attach documents"
                            >
                                <Paperclip className="w-5 h-5" />
                                <input type="file" ref={fileInputRef} className="hidden" multiple />
                            </button>

                            {/* Emoji Button */}
                            <button
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-yellow-600 hover:bg-white rounded-full transition-all duration-200"
                                title="Add emojis"
                            >
                                <Smile className="w-5 h-5" />
                            </button>
                        </div>

                        <textarea
                            className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-48 min-h-[48px] py-3.5 px-3 text-[15px] font-medium text-gray-800 placeholder-gray-400 leading-relaxed overflow-hidden"
                            placeholder="Message #general..."
                            rows={1}
                            value={inputText}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                e.target.style.height = 'inherit';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onKeyDown={handleKeyPress}
                        />

                        <div className="flex items-center pr-2 pb-1.5 gap-2">
                            {/* Voice Message Button */}
                            {!inputText.trim() && (
                                <button
                                    className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-white rounded-full transition-all duration-200"
                                    title="Record audio"
                                >
                                    <Mic className="w-5 h-5" />
                                </button>
                            )}

                            {/* Send Button */}
                            <button
                                className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-300 ${inputText.trim()
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:scale-105 hover:bg-indigo-700 active:scale-95'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                onClick={handleSend}
                                disabled={!inputText.trim() || isSending}
                            >
                                {isSending ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>
                    {/* Shortcuts hint */}
                    <div className="mt-3 flex justify-center gap-6">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-gray-500 shadow-sm">Enter</kbd> to send
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-gray-500 shadow-sm">Shift+Enter</kbd> new line
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};

export default ChatWindow;
