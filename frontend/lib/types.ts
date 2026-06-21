export interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    service?: string;
    uniqueId?: string;
}

export interface ConversationMember {
    userId: User | string;
    role: 'admin' | 'member' | 'observer';
    joinedAt: string;
    muted: boolean;
}

export interface Conversation {
    _id: string;
    type: 'direct' | 'group' | 'service' | 'project' | 'department' | 'system';
    name?: string;
    description?: string;
    relatedId?: string;
    relatedModel?: string;
    contextStringType?: string;
    contextStringValue?: string;
    members: ConversationMember[];
    lastMessage?: Message;
    lastMessageAt?: string;
    createdAt: string;
    updatedAt: string;
    unreadCount?: number; // Frontend only
}

export interface Message {
    _id: string;
    conversationId: string;
    senderId: User | string;
    content: string;
    contentType: 'text' | 'markdown' | 'system' | 'event';
    attachments: Attachment[];
    mentions: string[];
    actionRequired: boolean;
    actionType?: 'approve_funds' | 'assign_employee' | 'none';
    actionData?: any;
    actionStatus: 'pending' | 'completed' | 'rejected' | 'cancelled';
    actionPerformedBy?: string;
    isSystemMessage: boolean;
    createdAt: string;
    timestamp?: string; // For project-embedded messages
}

export interface Attachment {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
}
