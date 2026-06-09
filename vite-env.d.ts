/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_PAYPAL_CLIENT_ID?: string;
  readonly VITE_RAZORPAY_KEY_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_STORAGE_BUCKET_AVATARS?: string;
  readonly VITE_STORAGE_BUCKET_SUBMISSIONS?: string;
  readonly VITE_STORAGE_BUCKET_PROGRAM_ASSETS?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_MIXPANEL_TOKEN?: string;
  readonly VITE_APP_ENV?: string;
  readonly VITE_DEBUG?: string;
  readonly VITE_LANDING_ONLY?: string;
  readonly GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
