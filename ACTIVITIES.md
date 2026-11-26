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
