# 🎯 Snyk 125 Issues - Comprehensive Fixing Plan

**Date:** February 17, 2026 17:12 IST  
**Total Issues:** 125  
**Strategy:** Systematic fix of all DOM-based XSS vulnerabilities

---

## 📊 Issue Categories

Based on the scan and code analysis, the 125 issues break down into:

### 1. **Unsanitized Profile Images** (10+ issues)
**Files Identified:**
- ✅ `manager-dashboard/department/hr/profile/page.tsx` - FIXED
- ⏳ `manager-dashboard/department/hr/creation/[id]/view/page.tsx:211`
- ⏳ `manager-dashboard/department/hr/creation/new-create/page.tsx:1066`
- ⏳ `manager-dashboard/department/hr/creation/[id]/edit/page.tsx:747`
- ⏳ `manager-dashboard/department/hr/Attendance/[id]/view/page.tsx:662,684`

**Fix Pattern:**
```typescript
// Before:
<img src={userData.profileImage} alt="..." />

// After:
import { validateURL } from '@/lib/validation';
<img src={validateURL(userData.profileImage)} alt="..." />
```

---

### 2. **Unsanitized Social Media Links** (20+ issues)
**Common Pattern:**
```typescript
// Before:
<a href={profile.socialLinks.linkedin}>

// After:
<a href={validateURL(profile.socialLinks.linkedin)} target="_blank" rel="noopener noreferrer">
```

**Files to Check:**
- All profile-related components
- Manager components
- TL dashboard components
- Employee dashboard components

---

### 3. **Audio/Video Source URLs** (15+ issues)
**Files Identified:**
- `member-chat/page.tsx:635`
- `employee-dashboard/finance/service/chat/page.tsx:603`
- `employee-dashboard/finance/salary/chat/page.tsx:603`
- `employee-dashboard/finance/purchase/chat/page.tsx:603`

**Fix Pattern:**
```typescript
// Audio elements with blob URLs
<audio ref={audioRef} src={validateURL(url)} />
```

---

### 4. **Attendance Verification Images** (10+ issues)
**Files:**
- `Login/Attendance/page.tsx:871` - captured image  
- `manager-dashboard/department/hr/Attendance/[id]/view/page.tsx` - verification images

**Fix Pattern:**
```typescript
<img src={validateURL(attendance.virtualVerificationImage)} alt="..." />
```

---

### 5. **CSV Export Blob URLs** (10 issues)
**Status:** ✅ ALREADY FIXED
- All TL dashboard service pages
- HR attendance page
- Service team attendance component

---

### 6. **Window.open() Calls** (20+ issues)
**Common in:**
- File attachment downloads
- PDF viewers
- External link handlers

**Fix Pattern:**
```typescript
// Before:
window.open(url)

// After:
const sanitizedUrl = validateURL(url);
if (sanitizedUrl !== '#') {
  window.open(sanitizedUrl, '_blank', 'noopener,noreferrer');
}
```

---

### 7. **React State in URLs** (40+ issues)
**Most Common:**
- Profile images from useState
- User-generated content URLs
- File attachment URLs
- Link sharing URLs

**Fix Pattern:**
```typescript
// When setting state:
const [imageUrl, setImageUrl] = useState('');

// When using:
<img src={validateURL(imageUrl)} />
<a href={validateURL(linkUrl)}>
```

---

## 🔧 Fixing Strategy

### Phase 1: Critical User-Facing UI  (NOW)
1. ✅ HR Profile pages
2. ⏳ User creation/edit pages
3. ⏳ Attendance verification pages
4. ⏳ Profile view pages

### Phase 2: Chat & Media (Next)
5. ⏳ Audio player URLs
6. ⏳ File attachments
7. ⏳ Image messages

###Phase 3: Links & Navigation
8. ⏳ Social media links (all profiles)
9. ⏳ External links
10. ⏳ Window.open calls

### Phase 4: Form Inputs
11. ⏳ All user input fields that generate URLs
12. ⏳ File upload preview URLs

---

## 📝 Fix Template

For each file:

```typescript
// 1. Add import at top
import { validateURL } from '@/lib/validation';

// 2. Sanitize all URLs:
// - Image src
// - Link href  
// - Audio/video src
// - window.open()
// - blob URLs

// 3. Add security attributes to links:
target="_blank" rel="noopener noreferrer"
```

---

## 🎯 Progress Tracker

### Fixed (15/125) - 12%
- ✅ TL dashboard CSV exports (6 files)
- ✅ HR attendance CSV export (1 file)
- ✅ Service team attendance (1 file)
- ✅ HR profile page (3 URLs: image + 2 social links)
- ✅ TL Profile Content (already had validateURL)
- ✅ Manager Profile Content (already had validateURL)

### In Progress (0/125)
- Current batch being fixed

### Remaining (110/125) - 88%
- Profile images: 9 files
- Social links: ~20 instances
- Audio URLs: 4 files
- window.open: ~20 instances
- React state URLs: ~40 instances
- Other: ~17 instances

---

## 🚀 Next Steps

I'll now systematically fix all remaining issues in batches of 10-15 files at a time, starting with the most critical user-facing components.

**Estimated Time:** 15-20 minutes for all 125 issues
