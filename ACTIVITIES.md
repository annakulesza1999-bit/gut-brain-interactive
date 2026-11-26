# Interactive activities (development branch)

Open Presenter studio → Visual Slide & Question Editor.

- **+ Sequence (5 stages)** inserts editable HPA-axis example stages. Each stage has a prompt, choices, correct answer, explanation, before and after animations. Choose a built-in HPA preset or upload a GIF/PNG/JPEG/WebP (max 350 KB per file). Stages support optional automatic timed reveal and manual advance; duplicate or delete stages and update stage numbers to customize.
- **+ Draw a curve** adds a finger/mouse drawing activity with editable axis labels, horizontal tick labels and optional event marker. Each of the first 15 participants has a distinct session color and curve label. Drawings are held server-side until reveal. Projector defaults: 0.8 px, 28% opacity. Select legend entries to highlight; optional mean uses interpolation over the shared time range.
- Both activities use the existing session infrastructure. They do not automatically advance to the next activity. Curve submissions have no correct answer or score. Curves are session-memory-only; no dedicated export, second-attempt comparison or reference-curve editor yet.

Development only: existing app still needs full security review and runtime/build/multidevice tests before running or public hosting. Do not execute the original obfuscated startup scripts or bundled binary. The existing app still asks for names and phone numbers; anonymous joining and secure presenter authentication remain outstanding.

Unit tests for new pure activity helpers: `node --test test_activities.js` (after reviewing the imported source; this does not launch the server).

## Countdown, check-ins and text slides
- Presenter setup supports a default countdown in seconds (0 = off). Each response activity can inherit it, use a custom duration or disable it. On expiry the server closes submissions and reveals results; presenter still decides when to advance. Text slides are untimed.
- Participant reaction dock supports thumbs up/down and other floating reactions. The presenter sees a current check-in tally (latest thumb per participant), resettable at any time and cleared when moving between activities. Joined, online and completed counters are separate. Word cloud completion counts unique senders, not words.
- Add a Text slide in the visual editor. Enter a title and one point per line; enable **Reveal one line per click** or show everything at once. Presenter clicks Reveal next line or uses Space/Right Arrow. Student views receive only currently visible points.
- Existing app authentication, anonymous joining, and runtime verification remain outstanding. Check-in votes and drawings are not exported by the dedicated activity code.

## Presentation library
Presentation content now lives in a versioned IndexedDB library in the presenter's browser, separately from application code. The same browser profile and website origin are required to reopen the library. It is not a cloud account or cross-device sync service. Export complete .gutmind.json backups (including embedded media, settings, and up to 10 checkpoints) before updates, browser data deletion or changing hosting URLs. Import creates a new copy rather than overwriting an existing deck. Legacy JSON question arrays import too. Autosave runs after a short editing delay and before closing/presenting. Conflict detection prevents silently overwriting newer saves in a second tab. Future schema changes must use explicit migrations, not destructive replacements; unsupported versions are rejected without modifying the file. Browser storage can be cleared or evicted, and runtime validation is still required.

Use **Request persistent storage** to ask the browser to reduce automatic eviction risk; permission is browser-dependent and does not replace backups. Version history retains the latest ten checkpoints, rather than every keystroke.

## Point map and matching (batch 1)
- **Point map / anatomy quiz**: add a slide, choose built-in schematic body or upload an image (350 KB max), optionally enable grading, click the correct target in the editor, adjust the acceptance radius and points. Student submissions are one normalized coordinate; the projector shows each student's consistent participant color and number after reveal. Ungraded maps award no points. Graded results use distance in original image aspect ratio, with configurable tolerance. Keep sensitive personal disclosures optional; anonymous joining is not implemented yet.
- **Match pairs**: add 2–10 unique pairs; students tap left then right or drag with a mouse. The presenter sees correct pair counts after reveal. Partial credit is calculated server-side, based on correct matches. Both activities use existing countdowns, completion counts and the presentation library.
- Do not use the schematic body to grade detailed anatomy. A licensed anatomical diagram may be uploaded for a 2D quiz. A true rotatable 3D brain with anatomical meshes, camera-independent hit testing, cutaway views and anatomically verified answer regions is a separate planned activity, not implemented in this batch.
- Added pure-function tests in test_spatial_activities.js; full browser/session testing and existing security review still required.

## Batch 2: interactive simulations
- **Demand & coping**: editable fictional scenario and task, four 0–10 sliders, animated-state balance illustration and conceptual resource index; submitted cases compare side by side.
- **Stress & recovery**: 1–12 stressors and adjustable recovery speed over seven days; modeled activation curves and integrated activation above baseline; shared overlay uses participant colors and selectable scenarios. This is not a physiological measure of allostatic load.
- **Microbiome builder**: twelve fictional microbes, six types, richness, Shannon diversity (natural log), Pielou evenness (undefined for one type), abundance bars and even/uneven presets. Compare submitted communities without suggesting higher diversity is always better.
- All three use a common simulation activity type, editable initial settings and task text, 90-second initial countdown (customizable/off), server-validated final submissions, live completion count, reveal, and saved presentation backups. Exploratory, ungraded by design. Model equations are fixed, explicitly illustrative, not empirical or clinically validated. Unit tests in test_simulations.js; browser/security tests still outstanding.
