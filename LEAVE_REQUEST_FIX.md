# Leave Request Widget - 400 Error Fix

## Error Description

**Error**: `AxiosError - Request failed with status code 400`  
**Location**: `app/Compontent/LeaveRequestWidget.tsx` (line 32)  
**Endpoint**: `POST /api/attendance/self`  
**Status**: ✅ **FIXED**

## Root Cause

The `LeaveRequestWidget` was sending invalid data to the backend:

```typescript
// ❌ BEFORE (Problematic)
await axios.post('/api/attendance/self', {
    status: 'on-leave',
    leaveReason: reason.trim(),
    checkIn: new Date().toISOString(),
    environment: 'virtual'  // ← This caused the error!
});
```

### Why This Failed

The backend's `selfCreateAttendance` function has this validation logic:

```javascript
// Lines 459-470 in attendanceController.js
if (finalEnvironment === 'virtual' && finalStatus !== 'on-leave') {
    if (sleepDuration === undefined || !Array.isArray(cursorMovements)) {
        return res.status(400).json({
            errorCode: 'INVALID_FIELDS',
            message: 'For virtual environment: sleepDuration and cursorMovements are required'
        });
    }
}
```

**The Problem**:
1. Widget sent `environment: 'virtual'` + `status: 'on-leave'`
2. But it didn't send `sleepDuration` or `cursorMovements`
3. Although the condition says "!== 'on-leave'", the backend still validates the environment mode

Actually, looking closer at lines 444-450:

```javascript
if (finalEnvironment !== userMode) {
    return res.status(400).json({
        errorCode: 'INVALID_MODE',
        message: `You are configured for '${userMode}' attendance. Cannot create '${finalEnvironment}' attendance.`
    });
}
```

**The actual issue**: Users with `attendanceMode: 'physical'` (default) were being forced to submit physical attendance, but the widget was hardcoding `environment: 'virtual'`.

## The Fix

### Frontend Change (`LeaveRequestWidget.tsx`)

**Removed the hardcoded `environment: 'virtual'`**:

```typescript
// ✅ AFTER (Fixed)
await axios.post('/api/attendance/self', {
    status: 'on-leave',
    leaveReason: reason.trim(),
    checkIn: new Date().toISOString()
    // No environment needed - backend uses user's default mode
});
```

### Why This Works

1. **User's Mode Respected**: The backend will use the user's configured `attendanceMode` (from their profile)
2. **No Conflict**: No mode mismatch error since we're not forcing a specific environment
3. **Leave Logic Preserved**: The backend still handles leave requests correctly (sets `isApproved: false`, awaits HR approval)

## Backend Logic Flow

When a leave request is submitted:

```javascript
// 1. Get user's attendance mode
const userMode = req.user.attendanceMode || 'physical';

// 2. Use it as default if not specified
let finalEnvironment = environment || userMode;

// 3. For leave requests, monitoring data is ignored
if (finalStatus === 'on-leave') {
    isApproved = false;
    finalWorkedOnHoliday = false;
    finalHolidayType = null;
}

// 4. Virtual monitoring validation is skipped for leave
if (finalEnvironment === 'virtual' && finalStatus !== 'on-leave') {
    // Only validates if NOT on leave
    // ...
}
```

## Testing

### Test Case 1: Physical Attendance User

**User Profile**:
```json
{
  "name": "John Doe",
  "attendanceMode": "physical"
}
```

**Request** (from widget):
```json
{
  "status": "on-leave",
  "leaveReason": "Medical appointment",
  "checkIn": "2026-01-19T12:00:00.000Z"
}
```

**Result**: ✅ Creates leave request with `environment: 'physical'`, status: 'on-leave', `isApproved: false`

### Test Case 2: Virtual Attendance User

**User Profile**:
```json
{
  "name": "Jane Smith",
  "attendanceMode": "virtual"
}
```

**Request** (same as above):
```json
{
  "status": "on-leave",
  "leaveReason": "Personal emergency",  
  "checkIn": "2026-01-19T12:00:00.000Z"
}
```

**Result**: ✅ Creates leave request with `environment: 'virtual'`, status: 'on-leave', `isApproved: false`

## Related Code

### Files Modified
- ✅ `frontend/app/Compontent/LeaveRequestWidget.tsx` (line 32-36)

### Files Reviewed
- `backend/Controller/attendanceController.js` (line 356-614: `selfCreateAttendance` function)
- `backend/routes/attendanceRoutes.js` (line 48: route definition)

## Workflow After Fix

1. **User clicks "Request Leave"** in any dashboard with the widget
2. **Fills in reason** (minimum 10 characters)
3. **Clicks "Submit Request"**
4. **Frontend sends** minimal data (status, reason, checkIn)
5. **Backend creates** attendance record:
   - Uses user's default `attendanceMode`
   - Sets `status: 'on-leave'`
   - Sets `isApproved: false`
   - Stores `leaveReason`
6. **HR receives** notification of pending leave request
7. **HR approves/rejects** from the Attendance Management page

## Additional Notes

### Why Not Always Send Environment?

**Bad Practice**:
```typescript
environment: 'virtual' // Hardcoded assumption
```

**Better**:
```typescript
// Let backend use user's profile setting
// This respects their attendance configuration
```

### Attendance Mode Configuration

Users can have their attendance mode set in their profile:

```javascript
// In User model
{
  attendanceMode: 'virtual' | 'physical'  // Default: 'physical'
}
```

This determines:
- What verification methods are required
- What monitoring data is needed
- Whether they need biometric scans vs cursor tracking

## Prevention

To prevent similar issues in the future:

1. **Don't hardcode environment** in self-attendance widgets
2. **Let backend use user's mode** from their profile
3. **Only send required fields** for the specific action
4. **Leave requests are special** - they don't need monitoring data

## Summary

✅ **Error Fixed**: Removed hardcoded `environment: 'virtual'` from leave widget  
✅ **Respects User Mode**: Backend now uses user's configured attendance mode  
✅ **Leave Flow Works**: Managers can request leave regardless of their attendance mode  
✅ **No Breaking Changes**: Existing attendance creation still works normally  

The leave request widget now works for all users, whether configured for virtual or physical attendance!
