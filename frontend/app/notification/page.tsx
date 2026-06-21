'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/api';

type Notification = {
    _id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    projectId?: { uniqueId: string };
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [msg, setMsg] = useState<string>('');

    const load = async () => {
        try {
            const data = await authFetch('/workflow/notifications?limit=50');
            setNotifications(data.data);
        } catch (e: any) {
            setMsg(e.message);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const markRead = async (id: string) => {
        try {
            await authFetch(`/workflow/notifications/${id}/read`, { method: 'PUT' });
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, read: true } : n))
            );
        } catch (e: any) {
            setMsg(e.message);
        }
    };

    return (
        <section className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">My Notifications</h1>

            {msg && (
                <div className="p-2 mb-4 text-sm text-white bg-red-600 rounded">{msg}</div>
            )}

            {notifications.length === 0 ? (
                <p className="text-gray-500">No notifications.</p>
            ) : (
                <ul className="space-y-4">
                    {notifications.map((n) => (
                        <li
                            key={n._id}
                            className={`border rounded p-4 ${n.read ? 'bg-gray-50' : 'bg-indigo-50 border-indigo-300'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h2 className="font-semibold text-lg">{n.title}</h2>
                                    <p className="text-gray-700 mt-1">{n.message}</p>
                                    {n.projectId?.uniqueId && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Project: {n.projectId.uniqueId}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-2">
                                        {new Date(n.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                {!n.read && (
                                    <button
                                        className="ml-4 text-sm text-indigo-600 hover:underline"
                                        onClick={() => markRead(n._id)}
                                    >
                                        Mark read
                                    </button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
