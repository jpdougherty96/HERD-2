# How to Edit Email Templates in HERD

## Overview
Email templates are now embedded directly in the server code for better compatibility with Deno deployment. This makes them easy to edit while ensuring reliable deployment.

## Location
All email templates are located in `/supabase/functions/server/index.tsx` in the section marked:

```
// =====================================================
// EMAIL TEMPLATES - Easy to Edit
// =====================================================
```

## Available Templates

### 1. BOOKING_CONFIRMED
- **Purpose**: Sent to hosts when they receive a new confirmed booking
- **Variables**: HOST_NAME, CLASS_TITLE, GUEST_NAME, STUDENT_COUNT, STUDENT_NAMES, CLASS_DATE, HOST_EARNINGS, DASHBOARD_URL

### 2. BOOKING_APPROVAL_REQUEST
- **Purpose**: Sent to hosts when a booking requires manual approval
- **Variables**: HOST_NAME, CLASS_TITLE, GUEST_NAME, STUDENT_COUNT, STUDENT_NAMES, CLASS_DATE, HOST_EARNINGS, APPROVE_URL, DECLINE_URL

### 3. BOOKING_CONFIRMED_GUEST
- **Purpose**: Sent to guests when their booking is confirmed
- **Variables**: GUEST_NAME, CLASS_TITLE, INSTRUCTOR_NAME, CLASS_DATE, STUDENT_COUNT, STUDENT_NAMES, TOTAL_AMOUNT, CLASS_ADDRESS, DASHBOARD_URL

### 4. BOOKING_DENIED
- **Purpose**: Sent to guests when their booking is declined
- **Variables**: GUEST_NAME, CLASS_TITLE, INSTRUCTOR_NAME, CLASS_DATE, STUDENT_COUNT, STUDENT_NAMES, HOST_MESSAGE (optional), CLASSES_URL

## How to Edit Templates

1. **Open the server file**: `/supabase/functions/server/index.tsx`

2. **Find the EMAIL_TEMPLATES section** (around line 15-20)

3. **Edit the HTML directly** in the template strings. Each template is a property of the EMAIL_TEMPLATES object.

4. **Use variables** with double braces: `{{VARIABLE_NAME}}`

5. **Use conditional blocks** for optional content:
   ```html
   {{#HOST_MESSAGE}}
   <p>Message: {{HOST_MESSAGE}}</p>
   {{/HOST_MESSAGE}}
   ```

## Template Structure

### BASE Template
- Contains the outer HTML structure, HERD branding, and footer
- All content templates are automatically wrapped in this base

### Content Templates
- Contains the specific content for each email type
- Variables are automatically replaced when emails are sent
- Both HTML and text versions are generated

## Testing
After making changes:
1. Deploy the updated server code
2. Test with actual bookings or use the development tools
3. Check email logs in the server console for any template errors

## Best Practices

1. **Keep the HERD branding consistent** (colors: #556B2F for primary, #f8f9f6 for background)
2. **Test with real data** to ensure variables display correctly
3. **Keep mobile-friendly** with simple HTML and inline styles
4. **Include clear calls-to-action** with properly styled buttons
5. **Always include fallback text** for email clients that don't support HTML

## Fallback System
If there's an error processing templates, the system automatically falls back to simple inline HTML to ensure emails are always sent, even if formatting isn't perfect.