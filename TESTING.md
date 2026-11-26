# Preflight testing (development only)
Current branch remains blocked from production and binds only to 127.0.0.1. Do not expose it with a tunnel or use real classroom data yet.

## Verified in the review environment
- All 31 existing pure-logic checks were executed against source fetched at f02e00a4113f6f3470b1c1cfcc90e83110f4190f using an isolated JavaScript evaluator and assertion harness (not Node's actual test runner).
- An in-memory test of server handlers with mocked Express/Socket.IO/timers reproduced three access-control/answer-disclosure failures on that commit. After authentication and grading corrections, 23 of 23 mocked checks passed against 8e48e05067d2b914c17b9f12defc8e3a18629c87, including 15 anonymous participants, colored curves, countdown, text reveal, scoring, private results, reconnect and denied unauthorized access. The mock did not test real sockets, rendering or IndexedDB.
- The container cannot resolve github.com or registry.npmjs.org. No dependencies were installed and no actual full build or browser test was performed.

## Repeatable verification in a clean, network-enabled environment
Use Node 22. Review source and dependency lock before executing. No original executable or legacy publishing workflow is required.
1. `npm ci --ignore-scripts`
2. `node --test test_activities.js test_anatomy_activities.js test_presentations.js test_research_activities.js test_simulations.js test_spatial_activities.js`
3. `npm run prepare:atlas` (downloads a pinned, hash-checked data asset and copies decoder)
4. `npm run build`
5. `node --test test_session_smoke.js` (real loopback HTTP/Socket.IO, 15 synthetic students, no actual personal records)
6. `npm audit --omit=dev --audit-level=high` and review all results.
The new smoke test is authored but has not been executed in this environment. Even if it passes, do not infer browser/mobile or atlas geometry verification. Test actual phone touch interactions, rendering, editor autosave/reload, backup restore, view orientation and atlas mesh picking before classroom use. See SECURITY-REVIEW.md for remaining deployment blockers.

## Dependency remediation verification
2026-11-26: candidate run 45834680350 passed all 31 Node unit tests and the actual 15-client Socket.IO smoke test, built the frontend using Vite 6.4.6, prepared the pinned atlas, and reported zero vulnerabilities in the full npm audit. The exact npm-generated dependency lock is now committed for normal preflight. This does not verify actual WebGL rendering, IndexedDB or the presenter UI in a browser.
