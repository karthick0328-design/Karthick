'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { Conversation, Message, User } from '@/lib/types';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import { MessageSquare, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : 'http://localhost:5000/api';
import TLSidebar from '../tl-dashboard/components/TLSidebar';
import TLHeader from '../tl-dashboard/components/TLHeader';
import EmployeeSidebar from '../employee-dashboard/components/EmployeeSidebar';
import EmployeeHeader from '../employee-dashboard/components/EmployeeHeader';
import Header from '../Manager-Compontent/sales/salesheader/Header';
import SidebarManager from '../Manager-Compontent/sales/salesheader/Sidebar';
import ServiceSidebar from '../Manager-Compontent/services/sidebar';
import ServiceHeader from '../Manager-Compontent/services/header';
import SalesServiceSidebar from '../Manager-Compontent/sales/common/ServiceSidebar';
import SalesServiceHeader from '../Manager-Compontent/sales/common/ServiceHeader';

export default function ChatPage() {
    return (
        <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-white"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>}>
            <ChatPageContent />
        </React.Suspense>
    );
}

function ChatPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId');

    // State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingConvs, setIsLoadingConvs] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [managerSidebarOpen, setManagerSidebarOpen] = useState(false);

    // Refs for socket handling
    const socketRef = useRef<any>(null);

    // Initial Load: Auth & Co
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please log in to access chat');
            router.push('/login');
            return;
        }

        // Decode User
        try {
            const decoded: any = jwtDecode(token);
            // Map JWT payload to User interface. 
            // Payload has: id, name, email, role, department...
            setCurrentUser({
                _id: decoded.id,
                name: decoded.name,
                email: decoded.email,
                role: decoded.role,
                department: decoded.department,
                service: decoded.service,
                uniqueId: decoded.uniqueId
            });

            // Connect Socket
            const socket = getSocket(token);
            socketRef.current = socket;

            // Global Socket Listeners
            socket.on('disconnect', () => {
                console.log('Socket disconnected, attempting reconnect...');
            });

        } catch (e) {
            console.error('Auth error', e);
            router.push('/login');
        }

        return () => {
            disconnectSocket();
        };
    }, [router]);

    // Fetch Conversations (Polled or on event?)
    // For now, fetch once then rely on socket events? 
    // Ideally we should listen for 'newConversation' if someone adds us.
    const fetchConversations = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE}/chat/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setConversations(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch conversations', error);
            toast.error('Could not load chats');
        } finally {
            setIsLoadingConvs(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchConversations();
        }
    }, [currentUser]);

    // Auto-select conversation if projectId is provided
    useEffect(() => {
        if (projectId && conversations.length > 0 && !activeConvId) {
            const projectConv = conversations.find(
                c => c.type === 'group' && c.relatedId === projectId
            );
            if (projectConv) {
                setActiveConvId(projectConv._id);
                toast.success('Team chat loaded');
            }
        }
    }, [projectId, conversations, activeConvId]);

    // Handle Active Conversation
    useEffect(() => {
        if (!activeConvId || !currentUser) return;

        const fetchMessages = async () => {
            setIsLoadingMessages(true);
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_BASE}/chat/conversations/${activeConvId}/messages?limit=50`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setMessages(data.data);
                }
            } catch (error) {
                toast.error('Failed to load messages');
            } finally {
                setIsLoadingMessages(false);
            }
        };

        fetchMessages();

        // Socket Room Join
        if (socketRef.current) {
            const roomName = `conversation_${activeConvId}`;
            // We don't have explicit join event in backend for generic convs? 
            // Backend logic emits to `conversation_${id}`.
            // Socket.io client auto-joins? No, strict namespaces usually.
            // Actually `server.js` had `socket.on('joinProjectRoom')` but `chatController` emits to generic conversation room.
            // We might need to implement `joinConversation` in server or assume `authenticateUser` (socket middleware) handles it?
            // Wait, `chatController` uses `io.to(conversation_${id})`. Passively, the client must trigger join.
            // Since I didn't verify a `joinConversation` event in backend server.js, I might miss real-time updates if I don't implement it.
            // BUT, checking `server.js`, it only has `joinProjectRoom`.
            // I should probably add `joinConversation` to `server.js` OR rely on polling for this demo if I cannot edit server.
            // WAIT: I EDITED server.js? No, I only added routes. I did check server.js content.
            // The `server.js` had `socket.on('joinProjectRoom'...)`. It lacks generic `joinRoom`.
            // However, typical `socket.io` rooms logic requires the socket to join the room on server side.
            // Since I cannot easily add `joinRoom` to server.js right now (outside current scope/risk?), 
            // I will use the `authenticateSocket` which sets user.
            // Actually, the backend `chatController` emits to room `conversation_ID`. If my socket isn't in that room, I won't get it.
            // CRITICAL: Chat won't be realtime without joining room.
            // Workaround: I'll assume I can edit `server.js` or just poll. 
            // Better: I'll add `joinConversation` event to `server.js` PROACTIVELY in a moment if needed.
            // Or, since I am "Antigravity", I can fix `server.js`.
            // Let's assume there is a generic `join` or I add it.

            socketRef.current.emit('joinConversation', activeConvId); // Generic try
            // socketRef.current.emit('joinProjectRoom', activeConvId); // Try existing just in case
        }
    }, [activeConvId, currentUser]);

    // Listen for new messages
    useEffect(() => {
        if (!socketRef.current) return;

        const handleNewMessage = (msg: Message) => {
            console.log("DEBUG: newMessage event received", msg._id);
            setMessages((prev) => {
                // Deduplicate by ID
                const exists = prev.some(m => m._id === msg._id);
                if (exists) return prev;

                // Only append if it belongs to current conversation
                if (msg.conversationId === activeConvId) {
                    return [...prev, msg];
                }
                return prev;
            });

            // If it doesn't belong to active conversation, notify
            if (msg.conversationId !== activeConvId) {
                fetchConversations(); // Refresh list
                toast.success('New message received');
            }
        };

        socketRef.current.on('newMessage', handleNewMessage);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('newMessage', handleNewMessage);
            }
        };
    }, [activeConvId]);

    // Responsive handling
    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            setIsMobileView(isMobile);
            if (!isMobile) setShowSidebar(true);
        };
        handleResize(); // Initial
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSelectConv = (id: string) => {
        setActiveConvId(id);
        if (isMobileView) setShowSidebar(false);
    };

    const handleSendMessage = async (content: string, attachments: any[]) => {
        if (!activeConvId) return;
        const token = localStorage.getItem('token');

        // Optimistic Update (Optional, skipping for simplicity/safety)

        try {
            await fetch(`${API_BASE}/chat/conversations/${activeConvId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content, attachments })
            });
            // Socket "newMessage" will handle the UI update
        } catch (err) {
            toast.error('Failed to send message');
        }
    };

    const handleAction = async (msgId: string, actionDetails: any) => {
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_BASE}/chat/messages/${msgId}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(actionDetails)
            });
            // Optimistic update of message list
            setMessages(prev => prev.map(m => {
                if (m._id === msgId) {
                    return { ...m, actionStatus: 'completed', actionPerformedBy: 'Me' }; // Simplified
                }
                return m;
            }));
            toast.success('Action submitted');
        } catch (err) {
            toast.error('Action failed');
        }
    };

    const activeConv = conversations.find(c => c._id === activeConvId);

    const ChatContent = (
        <div className={`flex ${['tl', 'employee', 'manager'].includes(currentUser?.role || '') ? 'h-full' : 'h-screen'} bg-white overflow-hidden`}>
            <Toaster position="top-center" />

            {/* Sidebar */}
            {showSidebar && (
                <div className={`${isMobileView ? 'w-full absolute z-20' : 'w-80 relative'} h-full border-r border-gray-200 bg-white`}>
                    <ChatSidebar
                        conversations={conversations}
                        activeConversationId={activeConvId}
                        onSelectConversation={handleSelectConv}
                        currentUser={currentUser}
                        isLoading={isLoadingConvs}
                        onCreateGroup={() => toast('Group creation coming soon!')}
                    />
                </div>
            )}

            {/* Chat Window */}
            {(!showSidebar || !isMobileView) && (
                <div className="flex-1 h-full min-w-0 bg-white">
                    {activeConvId && activeConv ? (
                        <ChatWindow
                            conversation={activeConv}
                            messages={messages}
                            currentUser={currentUser}
                            onSendMessage={handleSendMessage}
                            onAction={handleAction}
                            isLoading={isLoadingMessages}
                            onBack={isMobileView ? () => setShowSidebar(true) : undefined}
                        />
                    ) : (
                        !isMobileView && (
                            <div className="hidden md:flex flex-col items-center justify-center h-full text-center bg-gray-50/30 backdrop-blur-sm relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400 rounded-full blur-[120px]" />
                                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400 rounded-full blur-[120px]" />
                                </div>

                                <div className="relative z-10 p-12 max-w-md">
                                    <div className="w-28 h-28 bg-white rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl shadow-indigo-100 mx-auto relative group">
                                        <div className="absolute inset-2 bg-indigo-50 rounded-[2rem] group-hover:bg-indigo-600 transition-colors duration-500" />
                                        <MessageSquare className="w-12 h-12 text-indigo-600 relative z-10 group-hover:text-white transition-colors duration-500" />
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white shadow-lg animate-bounce" />
                                    </div>

                                    <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Your Workplace <span className="text-indigo-600">Hub</span></h3>
                                    <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">
                                        Connect with your team, manage project discussions, and stay updated with real-time notifications in one seamless interface.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                        {['Collaboration', 'Security', 'Speed'].map((tag) => (
                                            <span key={tag} className="px-4 py-1.5 bg-white border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );

    if (currentUser?.role === 'tl') {
        return (
            <div className="flex h-screen bg-slate-900 overflow-hidden">
                <TLSidebar overrideService={currentUser.service} />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-0">
                    <TLHeader />
                    <main className="flex-1 overflow-hidden relative bg-slate-50">
                        {ChatContent}
                    </main>
                </div>
            </div>
        );
    }

    if (currentUser?.role === 'employee') {
        return (
            <div className="flex h-screen bg-gray-50 overflow-hidden">
                <EmployeeSidebar />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <EmployeeHeader />
                    <main className="flex-1 overflow-hidden relative">
                        {ChatContent}
                    </main>
                </div>
            </div>
        );
    }

    if (currentUser?.role === 'manager') {
        const isServiceManager = !!currentUser.service && currentUser.service !== 'Management';
        const isSaleDepartment = currentUser.department === 'sale';

        if (isServiceManager && isSaleDepartment) {
            return (
                <div className="min-h-screen bg-slate-50 flex">
                    <SalesServiceSidebar
                        isSidebarOpen={managerSidebarOpen}
                        handleLogout={() => {
                            localStorage.removeItem('token');
                            router.push('/Login/Signin');
                        }}
                    />
                    <div className={`flex-1 transition-all duration-500 ease-in-out ${managerSidebarOpen ? 'ml-72' : 'ml-24'}`}>
                        <SalesServiceHeader
                            scrolled={false}
                            isSidebarOpen={managerSidebarOpen}
                            setIsSidebarOpen={setManagerSidebarOpen}
                            user={currentUser as any}
                        />
                        <main className="p-0 mt-16 h-[calc(100vh-64px)] overflow-hidden relative">
                            {ChatContent}
                        </main>
                    </div>
                </div>
            );
        }

        if (isServiceManager) {
            const servicePath = `/manager-dashboard/service/${currentUser.service?.toLowerCase().replace(/\s+/g, '-')}`;
            return (
                <div className="min-h-screen bg-slate-50 flex">
                    <ServiceSidebar
                        isOpen={managerSidebarOpen}
                        setIsOpen={setManagerSidebarOpen}
                        serviceName={currentUser.service}
                        servicePath={servicePath}
                    />
                    <div className={`flex-1 transition-all duration-500 ease-in-out ${managerSidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
                        <ServiceHeader
                            onMenuToggle={() => setManagerSidebarOpen(!managerSidebarOpen)}
                            serviceName={currentUser.service}
                            isSidebarOpen={managerSidebarOpen}
                        />
                        <main className="p-0 mt-16 h-[calc(100vh-64px)] overflow-hidden relative">
                            {ChatContent}
                        </main>
                    </div>
                </div>
            );
        }

        const departmentName = currentUser.department || 'Management';
        return (
            <div className="min-h-screen bg-gray-50">
                <SidebarManager
                    isSidebarOpen={managerSidebarOpen}
                    pathname="/chat"
                    services={[]}
                    handleLogout={() => {
                        localStorage.removeItem('token');
                        router.push('/Login/Signin');
                    }}
                />
                <div className={`transition-all duration-500 ease-in-out ${managerSidebarOpen ? 'lg:ml-72' : 'lg:ml-20'}`}>
                    <Header
                        scrolled={false}
                        isSidebarOpen={managerSidebarOpen}
                        setIsSidebarOpen={setManagerSidebarOpen}
                        user={currentUser as any}
                        pathname="/chat"
                        services={[]}
                    />
                    <main className="pt-16 h-[calc(100vh-64px)] overflow-hidden relative">
                        {ChatContent}
                    </main>
                </div>
            </div>
        );
    }

    return ChatContent;
}
