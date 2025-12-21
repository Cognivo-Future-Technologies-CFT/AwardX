# AwardX Setup Guide

## Prerequisites

- Node.js installed
- Supabase account
- Google OAuth credentials (for Google sign-in)

## Step 1: Environment Variables

1. Create a `.env` file in the root directory with the following:

```env
VITE_SUPABASE_URL=https://yavozrvkpbywjdabygoo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhdm96cnZrcGJ5d2pkYWJ5Z29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjQ1MzYsImV4cCI6MjA3OTg0MDUzNn0.0KmaGooKL467-yeiy17rregL2Zs85ATPPfYA4hgFgwQ
VITE_SITE_URL=http://localhost:3000
```

2. If deploying to production, update `VITE_SITE_URL` to your production URL.

## Step 2: Database Setup

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/complete_schema.sql`
4. Paste and run it in the SQL Editor

This will create all necessary tables, indexes, RLS policies, triggers, and functions.

## Step 3: Configure Google OAuth

### 3.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the OAuth consent screen if prompted
6. Create an OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized JavaScript origins: 
     - `http://localhost:3000` (for development)
     - `https://your-domain.com` (for production)
   - Authorized redirect URIs:
     - `https://yavozrvkpbywjdabygoo.supabase.co/auth/v1/callback`
     - `http://localhost:3000` (for development)

7. Copy the Client ID and Client Secret

### 3.2 Configure in Supabase

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Providers
3. Find "Google" in the list and enable it
4. Enter your Google OAuth Client ID and Client Secret
5. Save the changes

### 3.3 Update Redirect URLs in Supabase

1. In Supabase dashboard, go to Authentication → URL Configuration
2. Add your site URLs to "Redirect URLs":
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Step 6: Testing Authentication

1. Navigate to the login page
2. Click the Google sign-in button
3. Complete the Google OAuth flow
4. You should be redirected back to the application and logged in

## Database Schema Overview

The schema includes:

- **Core Tables**: organizations, profiles, programs, submissions
- **Judging System**: judges, submission_judges, judging_criteria, scores
- **CRM**: contacts, contact_custom_fields
- **Messaging**: message_threads, messages, thread_participants
- **Marketing**: social_accounts, scheduled_posts, campaign_templates
- **CMS**: testimonials, pricing_tiers, features, use_cases, case_studies, FAQs
- **Audit**: audit_logs
- **RBAC**: roles, permissions, role_permissions, organization_members

## Row Level Security (RLS)

RLS is enabled on all sensitive tables. Basic policies are included, but you should customize them based on your security requirements.

## Next Steps

1. Customize RLS policies based on your security needs
2. Set up email templates in Supabase for password resets and invitations
3. Configure storage buckets for file uploads (avatars, submissions)
4. Set up webhooks if needed for payment processing
5. Configure additional OAuth providers (GitHub, LinkedIn) if needed

## Troubleshooting

### Google OAuth not working

- Verify redirect URIs match exactly in both Google Console and Supabase
- Check that Google OAuth is enabled in Supabase
- Verify Client ID and Secret are correct
- Check browser console for errors

### Database errors

- Ensure all extensions are enabled (uuid-ossp, pgcrypto)
- Verify foreign key constraints match the schema
- Check RLS policies aren't blocking access

### Environment variables not loading

- Ensure `.env` file is in the root directory
- Restart the development server after changing `.env`
- Verify variable names use `VITE_` prefix


