# Task: Client-Side Notification Center Widget

**Agent:** Main Developer
**Status:** Complete
**Files Created:** 1

## Work Log

- Read worklog.md (600+ lines) to understand full project context
- Analyzed existing header.tsx notification system for patterns
- Read API route `/api/client/notifications` — supports GET (fetch) and PUT (mark read/mark all read)
- Read Prisma schema — Notification model has metadata field (JSON string), type enum
- Read existing UI components: Sheet, ScrollArea, Tabs, Badge, Button, Skeleton
- Reviewed globals.css for existing animations (badge-pulse, glass-card, glow-emerald, etc.)

## Created: `/src/components/client/notifications-widget.tsx`

### Features Implemented:

1. **Floating Notification Button**
   - Fixed position bottom-right corner (bottom-6 right-6)
   - Bell icon with gradient emerald-to-teal background
   - Animated unread count badge (spring animation via framer-motion)
   - `animate-ping` pulse ring when unread notifications exist
   - `glow-emerald` CSS utility for glow effect
   - Focus-visible ring for accessibility
   - ARIA label with unread count

2. **Notification Panel (Sheet from right)**
   - Uses shadcn/ui `Sheet` with side="right"
   - Full-width on mobile, 420px max on desktop
   - Glassmorphism effect via `glass-card` utility class
   - Header with Bell icon, "Notifications" title, unread count badge
   - "Mark All Read" button with loading spinner state
   - SheetTitle and SheetDescription for accessibility

3. **Quick Stats Row**
   - 3-column grid with animated stat cards:
     - **Unread** (emerald) — count of unread notifications
     - **Today's Bookings** (amber) — bookings created today
     - **Pending** (rose) — unread escalation count
   - Each stat has type-specific icon, color, animated number transitions
   - AnimatePresence for value changes

4. **Filter Tabs**
   - All, Bookings, Escalations, System, Missed Calls
   - Uses shadcn/ui `Tabs` with full-width list
   - Compact text-xs styling, rounded triggers
   - Active tab shows white background with shadow

5. **Notification List**
   - Animated list items with staggered entrance (framer-motion layout animations)
   - Click to mark individual as read (calls PUT API)
   - Hover reveals X button for quick dismiss
   - Keyboard accessible (Enter/Space to mark read, focus-visible ring)
   - Type-based icon (CalendarCheck, AlertTriangle, PhoneMissed, Settings)
   - Type-based color coding:
     - Booking: emerald
     - Escalation: amber
     - Missed Call: rose
     - System: slate
   - Unread indicator: emerald dot with pulse animation + ring on icon
   - Title bold when unread, normal when read
   - Message truncated to 2 lines
   - Relative time display (date-fns formatDistanceToNow)
   - Type badge below each notification
   - Empty state with Inbox icon when no notifications
   - Skeleton loading state (4 skeleton rows)

6. **Toast Notifications**
   - Fires on new notifications detected during auto-refresh
   - Only toasts notifications created within last 2 minutes
   - Tracks toasted IDs via ref to prevent duplicates
   - Type-specific toast styles:
     - Booking: success toast (green) with "New Appointment: [patient] booked for [time]"
     - Escalation: warning toast (amber) with "Escalation: [caller] needs attention"
     - Missed Call: error toast (rose) with "Missed Call from [phone]"
     - System: info toast with title/message
   - Uses sonner toast with type-specific icons

7. **Auto-Refresh**
   - Fetches every 30 seconds
   - Compares previous notification IDs to detect new ones
   - Cleans up interval on unmount

### Styling:
- Emerald/teal primary colors throughout
- No indigo/blue colors
- Glassmorphism on Sheet panel
- Dark mode support (dark: variants on all elements)
- Mobile responsive (full-width sheet, proper touch targets)
- Framer Motion animations for badge, list items, stat values
- Existing CSS utilities reused (glass-card, glow-emerald, animate-badge-pulse, etc.)
- Smooth hover transitions on notification rows

### API Integration:
- `GET /api/client/notifications` with `x-clinic-id` header
- `PUT /api/client/notifications` with `{ id }` or `{ markAll: true }` body + `x-clinic-id` header
- Only renders for client role users with valid clinicId
- Silent error handling (no console noise)

## Verification:
- ESLint: 0 errors, 0 warnings
- Dev server: compiles successfully
- Component is self-contained, ready to be imported and rendered anywhere
