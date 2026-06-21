# Chat System Design Document

## 1. Overview
This document outlines the design for an integrated chat subsystem for the Biological Project Management System. The system supports direct messaging, group chats (Service, Department, Project, Ad-hoc), and rich features like attachments, read receipts, and workflow integration.

## 2. Workflows & Event Mapping

### 2.1 Project Creation & Assignment
1.  **Event**: `Project Created` (User submits project).
    *   **Action**: System creates a `Project Group` conversation.
    *   **Members**: Project Owner (User), Manager (Sales/Service).
    *   **Chat Message**: System posts "Project PRJ-XXX created. Waiting for quote."
2.  **Event**: `Manager Assigns TL`.
    *   **Action**: System adds TL to `Project Group`.
    *   **Chat Message**: System posts "Assigned to TL [Name]."
    *   **Notification**: TL receives push/direct message.
3.  **Event**: `TL Assigns Employee`.
    *   **Action**: System adds Employee to `Project Group`.
    *   **Chat Message**: System posts "Assigned to Employee [Name]."

### 2.2 Financial Escalation
1.  **User Action**: Service Manager clicks "Request Funds" on a project.
    *   **Chat Action**: 
        *   System creates/finds direct chat: Service Manager ↔ Financial Manager.
        *   System posts "Funding Request for Project PRJ-XXX" with attachment.
        *   System posts to `Financial Department Group`: "Incoming request from [Service]."
    *   **Workflow State**: Project status might move to "Financial Review" (optional).
2.  **User Action**: Financial Manager clicks "Approve" in Chat UI.
    *   **System Action**: Records approval in `AuditEvent`.
    *   **Chat Action**: Updates message UI to "Approved". System posts outcome to `Project Group`.

### 2.3 HR Escalation (Employee Shortage)
1.  **User Action**: Service Manager clicks "Report Shortage".
    *   **Chat Action**:
        *   System creates/finds direct chat: Service Manager ↔ HR Manager.
        *   System posts "Employee Shortage Reported for [Service]."
        *   System posts to `HR Department Group`.

## 3. Database Schema (Mongoose)

### 3.1 Conversation
```javascript
const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group', 'service', 'project', 'department', 'system'],
    required: true
  },
  name: { type: String, trim: true }, // For groups
  description: { type: String },
  relatedId: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedModel' }, // ProjectId, Service (string?), Dept (string?)
  relatedModel: { type: String, enum: ['Project', 'Service', 'Department'] }, // Dynamic ref
  
  // Normalized Members for performance + metadata
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member', 'observer'] }, // Chat-specific role
    joinedAt: { type: Date, default: Date.now },
    lastReadMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    muted: { type: Boolean, default: false }
  }],
  
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date, default: Date.now },
  
  settings: {
    isArchived: { type: Boolean, default: false },
    allowMemberInvite: { type: Boolean, default: false }, // Only admins can invite by default
    retentionDays: { type: Number, default: 90 }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

conversationSchema.index({ 'members.userId': 1, lastMessageAt: -1 });
```

### 3.2 Message
```javascript
const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  content: { type: String, trim: true }, // Text content
  contentType: { type: String, enum: ['text', 'markdown', 'system', 'event'], default: 'text' },
  
  attachments: [{
    filename: String,
    url: String, // Blob storage URL
    mimeType: String,
    size: Number,
    virusScanned: { type: Boolean, default: false }
  }],
  
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Threading
  threadRootId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  
  // Interactive Actions (for approvals)
  actionRequired: { type: Boolean, default: false },
  actionType: { type: String, enum: ['approve_funds', 'assign_employee', 'none'] },
  actionData: { type: mongoose.Schema.Types.Mixed }, // { projectId: ..., amount: ... }
  actionStatus: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
  
  isSystemMessage: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null } // Soft delete
}, { timestamps: true });
```

### 3.3 AuditEvent (Immutable Log)
```javascript
const auditEventSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who did it
  action: { type: String, required: true }, // e.g., 'CREATE_GROUP', 'APPROVE_FUNDS', 'ADD_MEMBER'
  targetType: { type: String, enum: ['Conversation', 'Message', 'Project', 'User'] },
  targetId: { type: mongoose.Schema.Types.ObjectId }, // ID of the target
  metadata: { type: mongoose.Schema.Types.Mixed }, // Extra details (e.g. "Added User X")
  ipAddress: String
}, { timestamps: { createdAt: true, updatedAt: false } }); // Immutable
```

## 4. API Specification

### 4.1 Conversations
*   `POST /api/chat/conversations`
    *   Create a new chat.
    *   Body: `{ type: 'group', name: 'My Group', members: ['uid1', 'uid2'] }`
*   `GET /api/chat/conversations`
    *   List my conversations.
*   `GET /api/chat/conversations/:id`
    *   Get details + members.
*   `PUT /api/chat/conversations/:id/members`
    *   Add/Remove members.

### 4.2 Messages
*   `GET /api/chat/conversations/:id/messages`
    *   Pagination: `?limit=50&beforeId=xxx`.
*   `POST /api/chat/conversations/:id/messages`
    *   Send message.
    *   Body: `{ content: 'Hello', attachments: [...] }`
*   `POST /api/chat/conversations/:id/messages/:messageId/react`
    *   Add reaction.

### 4.3 Actions (Workflow)
*   `POST /api/chat/actions/escalate-finance`
    *   Body: `{ projectId: 'xxx', amount: 5000, reason: '...' }`
    *   Trigger: Creates chat event/direct chat.
*   `POST /api/chat/messages/:messageId/approve`
    *   Body: `{ decision: 'approved' }`
    *   Trigger: Updates message `actionStatus`, logs audit, notifies system.

## 5. Security & Policies

### 5.1 RBAC Enforcement
*   **Auth Middleware**: Reuse existing `authenticateUser`.
*   **Chat Middleware**: New `inConversation` middleware to check membership before access.
*   **Service Isolation**: Managers can only see/join Service Groups they belong to.
*   **Hierarchy**:
    *   Drug Discovery Manager cannot DM Employee directly (must go through TL) - enforced by `POST /conversations` validation logic.

### 5.2 Data Retention
*   Project Groups: 7 Years.
*   Service/Dept Groups: 3 Years.
*   Ad-hoc/Direct: 90 Days.
*   *Implementation*: A nightly cron job (using `node-cron`) to soft-delete or archive messages older than policy.

### 5.3 Attachment Security
*   Uploads go to a temp staging area.
*   Scan for virus.
*   Move to permanent storage only if clean.
*   Access via Signed URLs (expire in 15 mins).

## 6. UI Component Specs

### 6.1 Layout
*   **Sidebar**: Tabs for [Projects] [Direct] [Groups]. Search bar.
*   **Main Area**: Conversation Header, Message List (Scrollable), Composer Input.
*   **Right Panel (Context)**: Project details (if Project Group), Participants list, Shared files.

### 6.2 Key Components
*   `ChatList`: Virtualized list of conversations.
*   `MessageBubble`: Renders text, Markdown, attachments. Distinct styles for "System" messages.
*   `ActionRequestCard`: A special message type for Approvals (buttons "Approve" | "Reject").
*   `Composer`: Rich text input, file picker, emoji picker.

## 7. Next Steps
1.  **Approval**: Waiting for user confirmation on this design.
2.  **Implementation**:
    *   Create Models (`Conversation.js`, `Message.js`, `AuditEvent.js`) in `backend/models`.
    *   Create Controller (`chatController.js`) in `backend/Controller`.
    *   Create Routes (`chatRoutes.js`) in `backend/routes`.
    *   Frontend Pages & Components.

## 8. Example JSON Flows

### 8.1 Scenario: Manager Assigns TL (Auto-post to Project Group)
**Context**: `Project-PRJ001-Group` already exists.
**Request**: `POST /api/projects/PRJ001/assign` (Legacy Endpoint triggers Chat Event)
**Resultant New Message**:
```json
{
  "_id": "msg_12345",
  "conversationId": "conv_project_prj001_id",
  "senderId": "system_user_id",
  "content": "Project assigned to TL John Doe.",
  "contentType": "system",
  "actionRequired": false,
  "isSystemMessage": true,
  "createdAt": "2025-12-10T10:00:00Z"
}
```

### 8.2 Scenario: Financial Escalation
**Context**: Service Manager requests funds.
**Request**: `POST /api/chat/conversations` (Create Direct Chat if not exists)
**Request Body**:
```json
{
  "type": "direct",
  "members": ["manager_id", "finance_manager_id"],
  "relatedId": "project_id"
}
```
**Follow-up Request**: `POST /api/chat/conversations/{id}/messages`
**Request Body**:
```json
{
  "content": "Requesting funds for extra reagents.",
  "actionType": "approve_funds",
  "actionData": {
    "amount": 5000,
    "currency": "USD",
    "projectId": "project_id"
  }
}
```
**Stored Message**:
```json
{
  "_id": "msg_999",
  "content": "Requesting funds for extra reagents.",
  "actionType": "approve_funds",
  "actionStatus": "pending",
  "actionRequired": true
}
```

### 8.3 Scenario: Approval Event
**Context**: Financial Manager clicks 'Approve'.
**Request**: `POST /api/chat/messages/msg_999/action`
**Request Body**: `{ "decision": "approved" }`
**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "msg_999",
    "actionStatus": "completed",
    "actionPerformedBy": "finance_manager_id"
  }
}
```

