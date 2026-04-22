# Security

## Reporting a vulnerability

Email **hello@cofr.cash** with a description of the issue. Please do not open a public GitHub issue for vulnerabilities.

## Telemetry

**None by default.** Sentry error tracking is only activated when both `SENTRY_DSN` and `ENV=production` are set in the server environment. Self-hosted instances with no `SENTRY_DSN` send zero telemetry anywhere.

## Data protection

- PII fields are encrypted at rest using Fernet symmetric encryption.
- Passwords are hashed with bcrypt; plaintext is never stored.
- JWT tokens are signed with `JWT_SECRET`; rotate it to invalidate all sessions.
