# Private pilot - candidate, NOT approved for deployment

Do not deploy yet. The production guard and loopback binding remain enabled. The private-pilot branch is separate from the verified offline editor. The test-only configuration cannot start in production or bind a public address.

## Intended design
- One presenter secret configured outside source control, random at least 32 characters. Never send it in chat or commit it.
- Session-specific 256-bit invitation token, copied only by authenticated presenter, in a URL fragment. Code alone cannot join. Share privately; forwarded links work until admission closes. Starting a session closes new joins; token-based reconnect remains possible.
- Two simultaneous sessions, 30 participants each, 100 connections, bounded socket events and session lifetime (six hours). No real names, phone numbers, persistent classroom records, or private lecture committed.
- Exact host/origin validation and same-origin Socket.IO. Production HTTPS/proxy configuration remains outstanding.

## Before public start
Verify candidate unit and 30-client tests; add actual online participant browser integration, review cross-role/cross-session authorization and all broadcasts, inspect leak/DoS risks, verify reverse proxy HTTPS and health checks, session expiry and cleanup under real usage. Only after explicit review replace the production guard with fail-closed production configuration. The offline branch must stay unchanged.
Use synthetic answers for any pilot. A private invitation is not an identity guarantee. The presenter should export results before session expiry/restart, if necessary.

## Render setup (after approval)
Choose Web Service, Git Provider > GitHub, repository gut-brain-interactive, branch deployment/private-pilot, Frankfurt, Node 22, one instance; disable auto deploy. Build: npm ci --ignore-scripts && npm run prepare:atlas && node scripts/prepare-design-fonts.mjs && npm run build. Start command after the production guard is replaced: node server/index.js. Health path: /api/info (subject to verified proxy configuration). Do not use any command to bypass the current guard. Do not store secrets in the repository. No database or private lecture files in the deployment artifact.
