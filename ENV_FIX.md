# Environment Variables Fix

## Issue
The `.env` file was using `NEXT_PUBLIC_` prefix instead of `VITE_` prefix, which is required for Vite projects.

## Solution
Updated `.env` file to use the correct variable names:

```env
VITE_SUPABASE_URL=https://yavozrvkpbywjdabygoo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhdm96cnZrcGJ5d2pkYWJ5Z29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjQ1MzYsImV4cCI6MjA3OTg0MDUzNn0.0KmaGooKL467-yeiy17rregL2Zs85ATPPfYA4hgFgwQ
VITE_SITE_URL=http://localhost:3000
```

## Important: Restart Required

**You MUST restart your development server for the changes to take effect:**

1. Stop the current server (Ctrl+C or Cmd+C)
2. Start it again: `npm run dev`

Vite only loads environment variables when the server starts, so any changes to `.env` require a restart.

## Verification

After restarting, the error message should disappear and Supabase authentication should work correctly.


