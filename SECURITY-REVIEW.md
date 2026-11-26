# Security review — initial static triage
Status: NOT approved for classroom deployment. Do not start the inherited main branch or its bundled executable. This document records source observations, not a penetration test.

## Confirmed findings on the development branch before this cleanup
- **Critical — presenter takeover:** reconnect_trainer and get_session_state accept caller-provided session code/role and reassign trainerSocketId without a secret. Checking socket ID elsewhere does not protect against that takeover.
- **Critical — administrative APIs:** routes for editing questions, reading and deleting trainer records, enumerating students, editing profiles, exporting records, and resetting the database lack authentication. API data and question banks can contain personal details or answer keys.
- **High — identity and confidentiality:** participant phone/name is used as identity, sent in participant lists and stored in persistent records. Session restoration accepts names/phones rather than a random secret. Some events accept caller-provided identity. Leaderboard and session state payloads require review for private answers and identifiers.
- **High — network exposure:** original server binds 0.0.0.0, permits wildcard CORS and supplies LAN HTTP join URLs even if hosted. Require correct HTTPS public origin, same-origin sockets and a secure session lifecycle.
- **High — inherited executable/config provenance:** opaque startup and Tailwind suffixes were removed in the redesign commit. No original executable or unreviewed install script was executed. More source and dependency review is still required.
- **Medium — resource limits:** large socket/HTTP payloads and in-memory sessions require bounded session counts, rate limits, inactivity expiry and safe validation.
- **Medium — anatomy scoring:** the server checks declared mesh ID and normalized point bounds, not membership of the point in the true mesh. Suitable for low-stakes formative use only after visual review; not tamper-proof exam scoring.

## Immediate containment on this branch
- Removed legacy npm publishing workflow, Windows executable/launcher and obsolete packaging helpers; marked npm package private.
- Removed inherited seeded participant data and seed function; new runtime database path is ignored by git and begins empty.
- Added temporary NODE_ENV=production startup block, to be replaced after security hardening. This is a precaution, not an access-control fix.
- Original main and Git history are unchanged. Any inherited historical records still need separate history/privacy review; removing a file does not erase it from prior commits or the upstream fork.

## Required before public deployment
1. Replace inherited authentication with random high-entropy presenter and participant session tokens; authorize every socket operation by server-verified membership and role. Remove or restrict legacy APIs; avoid collecting phone numbers and real names.
2. Keep response records in memory unless explicitly exported; no persistent student directory, personal identity logs or unrelated sample records. Review public payloads for hidden answers and secret identifiers.
3. Enforce same-origin/HTTPS setup, validated public join URL, rate limits, input validation, session limits and expiration. Protect admin operations and reconnection.
4. Review all source and dependencies, install with lockfile in a clean network-enabled environment, run dependency audit, build, and run all unit tests and actual browser tests. Prepare the pinned atlas and verify its integrity; test touch selection, views and performance on real devices.
5. Exercise two-client and multi-client sessions, reconnects, pause/resume, countdowns, duplicate submissions, presentation backups across updates, and attempted unauthorized access. Verify no answer key leaks before reveal. Check the original fork/history for remaining sensitive records before any public exposure.
6. Only after these pass, deploy a single same-origin HTTPS Node/Socket.IO service with stable URL. No host selected or connected yet; account setup and any charges require user approval.

## Current limitations
The review environment cannot resolve the npm registry (EAI_AGAIN), so no dependency installation, audit, production build, end-to-end testing or live hosting has been performed. Five isolated anatomy logic checks passed; these do not test WebGL or the original server. No card game work planned at present.

## Local preview verification changes
- Anonymous joining assigns a unique session participant number and random reconnect token; the browser retains role-specific tokens in sessionStorage. No real student identity or account is required. Public state and leaderboard exclude private tokens and live answers. Presenter restoration requires the original presenter socket or its token. MCQ correctness and scores are computed on reveal rather than returned immediately. Legacy profile/admin endpoints are disabled in this preview; server and Vite bind to loopback only; production guard remains enabled. Remote control is intentionally disabled pending secure pairing.
- Remaining: full end-to-end testing, a formal authorization review (including cross-session/socket lifecycle and origin enforcement), public hosting configuration, rate limiting, session expiry, and dependency review. Local preview is not an approval to use real classroom data or deploy publicly.

The 23 mocked session regression checks passed after the authorization and grading changes. A real-socket test has been added but not executed; see TESTING.md. These checks are not a complete security audit.

## Dependency remediation candidate
The second preflight run (45833855861) passed the 31 unit tests, pinned atlas preparation, production frontend compilation, and real 15-client loopback smoke test. Audit identified body-parser 1.20.6, proxy-addr 2.0.7, qs 6.15.3 and xlsx 0.18.5. Candidate uses exact patched transitive overrides (1.20.9, 2.0.8, 6.16.2) and removes the disabled legacy workbook export and obsolete export script. Current CSV exports are retained. The candidate lockfile must be generated by npm, reviewed, and committed before merging into the development branch. Audit is strict across production and development dependencies; no vulnerability is suppressed. Public deployment guard remains in effect.

Candidate run 45834486533: package installation, all 31 tests, atlas, frontend build and 15-client smoke test passed. Expanded audit reports only three development dependency findings (postcss-selector-parser, source-map-js, Vite); none of the four original production findings remain. The next candidate uses the 6.1.5 backport for the CSS selector parser, source-map-js 1.2.2, and Vite 6.4.6 within the existing major version. Verify all again before merging.

### Remediation result
Candidate run [45834680350](https://github.com/annakulesza1999-bit/gut-brain-interactive/actions/runs/45834680350) completed successfully: clean install, 31 unit tests, pinned atlas, frontend build, 15-client actual loopback integration, and full `npm audit --audit-level=low` reporting **0 vulnerabilities**. All six patched versions and removal of xlsx are recorded in the npm-generated lockfile. No audit exclusions. This is a dependency audit, not a penetration test or approval for public hosting. Final development branch preflight uses only `npm ci --ignore-scripts`, not lock regeneration. Browser and mobile verification, application-level security, and deployment remain outstanding.
