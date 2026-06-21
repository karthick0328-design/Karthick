'use client';

import React from 'react';
import { Message, Attachment, User } from '@/lib/types';
import { FileText, Image as ImageIcon, Download, CheckCheck, Check, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
    isCurrentUser: boolean;
    onAction?: (messageId: string, actionDetails: any) => void;
    previousMessage?: Message;
}

const formatTime = (date?: string) => {
    if (!date) return 'Just now';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Just now';

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
};

const FileAttachment = ({ attachment }: { attachment: Attachment }) => (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all max-w-xs group cursor-pointer">
        <div className="p-2 bg-white border border-gray-100 rounded-lg">
            {attachment.mimeType?.startsWith('image/') ?
                <ImageIcon className="w-5 h-5 text-purple-600" /> :
                <FileText className="w-5 h-5 text-blue-600" />
            }
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{attachment.filename || 'Untitled File'}</p>
            <p className="text-xs text-gray-500">{attachment.size ? (attachment.size / 1024).toFixed(1) : '0'} KB</p>
        </div>
        <a
            href={attachment.url}
            download
            className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-all"
            onClick={(e) => e.stopPropagation()}
        >
            <Download className="w-4 h-4" />
        </a>
    </div>
);

const ApprovalCard = ({ message, onAction }: { message: Message, onAction?: any }) => {
    const isCompleted = message.actionStatus !== 'pending';
    const isApproved = message.actionStatus === 'completed';

    return (
        <div className="mt-3 mb-1 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                        {message.actionType === 'approve_funds' ? '💰 Funding Request' : '⚡ Action Required'}
                    </span>
                </div>
                {isCompleted && (
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${isApproved
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {isApproved ? '✓ Approved' : '✗ Rejected'}
                    </span>
                )}
            </div>
            <div className="p-5 bg-white">
                {message.actionType === 'approve_funds' && message.actionData && (
                    <div className="mb-5">
                        <p className="text-3xl font-black text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: message.actionData.currency || 'USD' }).format(message.actionData.amount)}
                        </p>
                        <p className="text-sm text-gray-600 font-medium mt-1">Requested for Project {message.actionData.projectId}</p>
                    </div>
                )}

                {!isCompleted ? (
                    <div className="flex gap-3">
                        <button
                            onClick={() => onAction && onAction(message._id, { decision: 'approved' })}
                            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm flex justify-center items-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" /> Approve
                        </button>
                        <button
                            onClick={() => onAction && onAction(message._id, { decision: 'rejected' })}
                            className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-gray-700 text-sm font-bold rounded-xl transition-all shadow-sm"
                        >
                            Reject
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-2 text-sm text-gray-500 italic font-medium">
                        ✓ Action performed by {message.actionPerformedBy || 'User'}
                    </div>
                )}
            </div>
        </div>
    );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, onAction, previousMessage }) => {

    // System Message Handling
    if (message.isSystemMessage || message.contentType === 'system') {
        return (
            <div className="flex justify-center my-8 relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative px-6 py-2 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 shadow-sm flex items-center gap-2">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    {message.content}
                </div>
            </div>
        );
    }

    // Determine sender name handling
    const senderId = message.senderId;
    const senderName = (senderId && typeof senderId === 'object') ? senderId.name : 'User';

    const prevSenderId = previousMessage?.senderId;
    const currentSenderIdStr = (senderId && typeof senderId === 'object') ? senderId._id : senderId;
    const prevSenderIdStr = (prevSenderId && typeof prevSenderId === 'object') ? prevSenderId._id : prevSenderId;

    const showHeader = !previousMessage || currentSenderIdStr !== prevSenderIdStr;

    return (
        <div className={`flex w-full mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`flex max-w-[85%] lg:max-w-[70%] group ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>

                {/* Avatar */}
                {!isCurrentUser && (
                    <div className={`flex-shrink-0 w-9 h-9 rounded-2xl ${isCurrentUser
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                        : 'bg-white border border-gray-100'
                        } flex items-center justify-center text-indigo-600 text-sm font-black shadow-sm transition-all duration-300 ${showHeader ? 'opacity-100 scale-100' : 'opacity-0 scale-90 translate-y-2'}`}>
                        {senderName.substring(0, 1).toUpperCase()}
                    </div>
                )}

                <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name */}
                    {!isCurrentUser && showHeader && (
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 flex items-center gap-2">
                            {senderName}
                            {(senderId && typeof senderId === 'object' && senderId.role) && (
                                <>
                                    <span className="h-1 w-1 bg-gray-200 rounded-full" />
                                    <span className="text-indigo-600 font-extrabold">{senderId.role}</span>
                                </>
                            )}
                            <span className="h-1 w-1 bg-gray-200 rounded-full" />
                            {formatTime(message.timestamp || message.createdAt)}
                        </span>
                    )}

                    {/* Message Bubble */}
                    <div className={`relative group/bubble transition-all duration-200 ${showHeader ? 'mt-0' : 'mt-0'}`}>
                        <div className={`px-5 py-3 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-[15px] leading-relaxed font-medium transition-all duration-300 group-hover/bubble:shadow-md ${isCurrentUser
                            ? 'bg-indigo-600 text-white rounded-br-sm shadow-indigo-100'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm group-hover/bubble:border-indigo-100'
                            }`}>

                            <div className="whitespace-pre-wrap break-words">
                                {message.content}
                            </div>

                            {/* Time and Read Receipts */}
                            {isCurrentUser && (
                                <div className="mt-1.5 flex items-center justify-end gap-1.5 opacity-70">
                                    <span className="text-[9px] font-bold uppercase tracking-tighter text-indigo-100">{formatTime(message.timestamp || message.createdAt)}</span>
                                    <CheckCheck className="w-3.5 h-3.5 text-indigo-100" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Inline Action Card */}
                    {message.actionRequired && (
                        <div className="w-full max-w-sm mt-3">
                            <ApprovalCard message={message} onAction={onAction} />
                        </div>
                    )}

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 grid grid-cols-1 gap-2">
                            {message.attachments.map((att, i) => (
                                <FileAttachment key={i} attachment={att} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
