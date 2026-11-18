# Supabase Auth email templates

Branded templates for RCA Pilot by Intelbeyond. Sender: no-reply@rcapilot.com (via Resend SMTP).

In the Supabase dashboard go to Authentication > Emails > Templates, pick the template, set the subject, and paste the HTML from the file.

| Dashboard template | Suggested subject | File |
|---|---|---|
| Confirm sign up | Confirm your email address for RCA Pilot | `confirm-signup.html` |
| Reset password | Reset your RCA Pilot password | `reset-password.html` |
| Magic link | Your RCA Pilot sign-in link | `magic-link.html` |
| Change email address | Confirm your new email address | `change-email.html` |
| Reauthentication | Your RCA Pilot verification code | `reauthentication.html` |
| Invite user | You've been invited to RCA Pilot | `invite.html` |

Notes:

- Links use `{{ .ConfirmationURL }}`, which already honours the `emailRedirectTo` / `redirectTo` the app passes.
- Variables used: `{{ .Email }}` (all but reauthentication), `{{ .NewEmail }}` (change email only), `{{ .Token }}` (reauthentication only).
- Layout is table-based with inline styles and no images, with a small dark-mode style block.
- Expiry wording is "expires soon", so it stays correct if the OTP expiry setting changes.
- `previews/` holds PNG renders with sample values.
