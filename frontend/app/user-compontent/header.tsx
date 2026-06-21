"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Bell,
  Search,
  Menu,
  X,
  User,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter, usePathname } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { toastConfig } from "../../utils/toastConfig";
import { getSocket } from "@/lib/socket";

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
}

interface DecodedToken {
  name: string;
  email: string;
  role?: string;
  [key: string]: string | number | undefined;
}

interface HeaderProps {
  onMenuToggle: () => void;
  user: { name: string; role: string };
}

export default function NewHeader({ onMenuToggle, user }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const processedMsgIds = useRef<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please log in", toastConfig.error);
      router.push("/Login/Signin");
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, [router]);

  const fetchNotifications = useCallback(async () => {
    // Placeholder for future user notification fetch
  }, []);

  useEffect(() => {
    fetchNotifications();
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const socket = getSocket(token);
        const decoded = jwtDecode<{ id?: string; userId?: string }>(token);
        const userId = decoded.id || decoded.userId;

        const handleNewMessage = (payload: any) => {
          const msg = payload.message || payload;
          const senderId =
            typeof msg.senderId === "object"
              ? msg?.senderId?._id
              : msg?.senderId;
          if (!msg || !msg._id) return;

          if (
            senderId !== userId ||
            msg.isSystemMessage ||
            msg.contentType === "system"
          ) {
            if (processedMsgIds.current.has(msg._id)) return;
            processedMsgIds.current.add(msg._id);

            const isSystem =
              msg.isSystemMessage || msg.contentType === "system";
            toast.success(
              isSystem
                ? `System Update: ${msg.content.substring(0, 30)}...`
                : `New message from ${msg.senderId?.name || "someone"}`,
              {
                icon: isSystem ? "🔔" : "💬",
                duration: 5000,
              },
            );

            const newNotif: Notification = {
              id: `msg-${Date.now()}-${msg._id}`,
              text: isSystem
                ? `System: ${msg.content}`
                : `New chat message: ${msg.content.substring(0, 40)}${msg.content.length > 40 ? "..." : ""}`,
              time: "Just now",
              read: false,
            };
            setNotifications((prev) => [newNotif, ...prev]);
          }
        };

        socket.on("newMessage", handleNewMessage);
        return () => {
          socket.off("newMessage", handleNewMessage);
        };
      } catch {
        console.error("Socket error in header");
      }
    }
  }, [fetchNotifications]);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const getContextLabel = () => {
    if (pathname.includes("/Project")) return "Project Center";
    if (pathname.includes("/Payment")) return "Payment Hub";
    if (pathname.includes("/Tool")) return "Resource Lab";
    if (pathname.includes("/Profile")) return "User Profile";
    if (pathname.includes("/member-chat")) return "Secure Chat";
    return "User Portal";
  };

  const currentContext = getContextLabel();

  return (
    <header
      className={`sticky top-0 z-50 h-24 transition-all duration-300 flex items-center px-10 justify-between ${scrolled || notificationsOpen
        ? "bg-white border-b border-slate-200 shadow-lg shadow-indigo-100/20"
        : "bg-white border-b border-slate-100"
        }`}
    >
      <div className="flex items-center gap-6">
        <button
          onClick={onMenuToggle}
          suppressHydrationWarning
          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-500 hover:text-slate-900"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
            {currentContext}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <UserCircle size={10} />
            <span>Client Platform</span>
            <ChevronRight size={10} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              suppressHydrationWarning
              className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-500 hover:text-slate-900 shadow-sm hover:shadow-md transition-all relative"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
              )}
            </button>

            {notificationsOpen && (
              <div className="origin-top-right absolute right-0 mt-4 w-96 rounded-3xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-5 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors flex gap-4 ${notification.read ? "opacity-60" : ""
                          }`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notification.read ? "bg-slate-200" : "bg-indigo-600"
                            }`}
                        />
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-snug">
                            {notification.text}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell size={24} className="text-slate-300" />
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        No new notifications
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pl-6 border-l border-slate-100 flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-black text-slate-900 leading-none">
                {user?.name || "Guest User"}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {user?.role || "Member"}
              </p>
            </div>
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 font-bold text-lg">
              {user?.name?.charAt(0).toUpperCase() || <User size={20} />}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
      `}</style>
    </header>
  );
}
