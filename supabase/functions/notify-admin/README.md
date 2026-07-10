# notify-admin — email notifications to the Super Admin

The app (Notifications › Alerts Dashboard → **Email to Admin**) calls this
Supabase Edge Function to send an alerts digest to the super admin. The
recipient address is whatever is saved in **Settings › Notifications** (falls
back to the login admin address).

## One-time setup

1. Install the Supabase CLI and log in:

   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref odnjpcjifmwswzelgocy
   ```

2. Create a free [Resend](https://resend.com) account and grab an API key.

3. Set the secret and deploy:

   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   # optional: a verified sender, defaults to onboarding@resend.dev
   supabase secrets set NOTIFY_FROM="HOMIQLO <alerts@yourdomain.com>"
   supabase functions deploy notify-admin --no-verify-jwt
   ```

Until the function is deployed, the **Email to Admin** button reports a clear
error and nothing else in the app is affected.
