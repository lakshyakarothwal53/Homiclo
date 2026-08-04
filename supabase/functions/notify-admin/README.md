# notify-admin Edge Function

Sends alert digests to the admin email address via Resend or logs to console.

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Link Your Supabase Project

```bash
supabase link
```

### 3. Configure Email Service (Choose One)

#### Option A: Use Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from Resend dashboard
3. Add to your Supabase project secrets:

```bash
supabase secrets set RESEND_API_KEY your_resend_api_key_here
```

#### Option B: Use Supabase Email (if enabled in your project)

Update the function to use `supabase.auth.admin.inviteUserByEmail()` or send via SMTP.

### 4. Deploy the Function

```bash
supabase functions deploy notify-admin
```

### 5. Test

Click "Email to Admin" in the Alerts Dashboard. You should see:
- ✅ Email sent if RESEND_API_KEY is configured
- 📋 Clipboard fallback if not configured

## Environment Variables

- `RESEND_API_KEY` - Your Resend API key (required for actual email sending)

## How It Works

1. Frontend calls this function with `{ to, subject, html }`
2. Function sends email via Resend API
3. Falls back to console logging if API key not configured
4. Returns success/error to frontend

## Troubleshooting

**Error: "Email function not reachable"**
- Function is not deployed yet, run `supabase functions deploy notify-admin`

**Email not sending with Resend configured**
- Check RESEND_API_KEY is set: `supabase secrets list`
- Verify it's the correct key from Resend dashboard
- Check function logs: `supabase functions logs notify-admin`

**Using Gmail/Outlook instead of Resend**
- Update function to use SMTP (see commented code below)
- Add email provider credentials to secrets
