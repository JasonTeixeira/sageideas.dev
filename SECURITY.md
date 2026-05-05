# Security Policy

## Reporting a Vulnerability

If you believe you've found a security issue in Sage Ideas Studio, please do not
open a public GitHub issue. Instead, email **sage@sageideas.dev** with:

- A description of the issue and its impact
- Steps to reproduce (proof-of-concept welcome)
- Any relevant logs, screenshots, or affected URLs

We aim to acknowledge reports within **2 business days** and provide a
remediation plan within **7 business days**. We coordinate disclosure with
reporters and credit researchers in release notes when desired.

## Scope

In scope:

- The production app at https://www.sageideas.dev
- The Sage Ideas Studio Supabase backend (auth, RLS, storage)
- Admin and portal routes (`/admin/*`, `/portal/*`)
- Stripe checkout, contract e-sign, and email orchestration flows

Out of scope:

- Social engineering, physical attacks, or DoS
- Third-party services (Stripe, Supabase, Resend) — please report directly to them
- Reports based solely on automated scanner output without a working PoC

## Safe Harbor

Good-faith research conducted under this policy will not result in legal action.
Please do not exfiltrate user data, disrupt service, or test against accounts
you don't own.
