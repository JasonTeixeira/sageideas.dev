# Auth email hook setup

This wires up branded auth emails (signup confirm, password reset, magic link, invite, email-change, reauth) to be sent through Resend instead of Supabase's default SMTP.

The hook lives at `POST /api/auth/email-hook` and is signed using Supabase's standard webhooks signing scheme (HMAC-SHA256 over `webhook-id.webhook-timestamp.body`).

## One-time configuration

### 1. Generate the hook secret in Supabase

1. Open <https://supabase.com/dashboard/project/hocrntqhgvmeaxwlhzwl/auth/hooks>.
2. Find **Send Email Hook** and click **Enable**.
3. Pick **HTTPS** as the hook type.
4. Set the **URL** to:
   ```
   https://www.sageideas.dev/api/auth/email-hook
   ```
5. Click **Generate secret**. Copy the full value — it looks like `v1,whsec_AbCdEf...`. Save it; the dashboard will not show it again.
6. Click **Create hook** (or **Save**).

### 2. Add the secret to Vercel

1. Open the Vercel dashboard → this project → **Settings** → **Environment Variables**.
2. Add a new variable:
   - **Name:** `SUPABASE_AUTH_HOOK_SECRET`
   - **Value:** the full `v1,whsec_...` value you copied above (do NOT strip the prefix — the route does that itself).
   - **Environments:** check Production, Preview, and Development.
3. Save.
4. Trigger a redeploy (push a no-op commit, or hit "Redeploy" on the latest deployment) so the new env var is picked up.

### 3. Verify

1. Go to <https://www.sageideas.dev/auth/forgot-password>.
2. Submit your real email address.
3. Watch your inbox — you should receive a "Reset your password" email with the Sage Ideas Studio header gradient.
4. Click the **Reset password** button — it should land you on `/auth/reset` with a valid session.

If nothing arrives, check:
- Vercel logs for `/api/auth/email-hook` — a 401 means the secret is wrong; a 500 means the secret env var is not set; a 502 means Resend rejected the send.
- The `email_log` table in Supabase — the hook logs every send attempt there.
- Resend dashboard → Logs — look for the message ID returned by the hook.

## What gets sent

| `email_action_type`            | Subject                          | Heading                  |
| ------------------------------ | -------------------------------- | ------------------------ |
| `signup`                       | Confirm your email               | Welcome to Sage Ideas    |
| `recovery`                     | Reset your password              | Password reset request   |
| `magiclink`                    | Your sign-in link                | Sign in to Sage Ideas    |
| `invite`                       | You're invited to Sage Ideas     | You've been invited      |
| `email_change_current` / `_new`| Confirm email change             | Confirm your new email   |
| `reauthentication`             | Verify it's you                  | Confirm your identity    |

All emails:
- Send from `Sage Ideas <sage@sageideas.dev>`.
- Use the shared dark studio layout (`components/email/_layout.ts`).
- Include a plain-text fallback.
- Carry a `List-Unsubscribe` header.
- Are logged to the `email_log` Supabase table.

## Files

- `app/api/auth/email-hook/route.ts` — signed webhook handler.
- `lib/emails/authEmail.ts` — branded HTML/text renderer per action type.
- `components/email/_layout.ts` — shared layout primitives.
- `lib/email/send.ts` — Resend wrapper with `email_log` insert.
