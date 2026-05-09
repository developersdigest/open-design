# Brand Forge - Recording Guide

Shot list for the n8n video. Faceless voiceover, screen-only. No face cam, no on-camera presence.

## 1. Setup before recording

- [ ] Clean shell prompt - run `starship init` or set `PS1='$ '` so the prompt is one character
- [ ] Browser zoom set to 110% (Cmd+= twice from default)
- [ ] Use Chrome incognito - no extensions, no profile chrome, no autofill popups
- [ ] n8n running at `localhost:5678`, workflow already imported AND toggled Active
- [ ] Web app running at `localhost:3000` in a second tab
- [ ] Terminal font size 16pt or larger
- [ ] Hide Chrome bookmarks bar (Cmd+Shift+B)
- [ ] Close every other tab and Slack/Discord/Mail
- [ ] Do Not Disturb on
- [ ] `make dev` already warm so first request isn't a cold start
- [ ] Test record 10s and check audio peaks before the real take

## 2. Recording order

### Beat 1 - the canvas (0:00)
Open n8n at `localhost:5678`, click into `Brand API (3 routes in one workflow)`. Hit `Cmd+Shift+1` to zoom-to-fit. Hold the wide shot for 2 seconds, then slowly cursor-point at each of the 4 webhook entry points down the left side - Decode, Design, HTML, Assets - pausing roughly 5 seconds on each. This is the establishing shot. Voiceover: "one workflow, four routes."

### Beat 2 - smoke test (0:30)
Cmd+Tab to terminal. Run `make smoke --quick`. Let viewers see one webhook fire and a 200 come back. Don't talk over the response - let it land.

### Beat 3 - decode (1:00)
Switch to the web app. Paste `https://stripe.com` into the URL field. Click Decode. Narrate the response as it paints - Firecrawl pulls the markdown and branding tokens, Kimi rewrites the hero copy. Call out the actual Stripe colors showing up.

### Beat 4 - design (2:30)
Click Design. While the request is in flight, Cmd+Tab back to the n8n canvas and hover the Design route - viewers should see the execution log light up Kimi: Strategy, then Stash, then Kimi: Design.md. Two-step pass. Cut back to the web app to show the rendered `design.md`.

### Beat 5 - assets (4:00)
Click Assets. This is the money shot. The Build prompts node fans out to 4 items, Fal generates each, Aggregate collapses them back. Show the canvas mid-execution so the fan-out shape is visible, then cut to the web app as the 4 images paint in. Call out that the colors match the brand - these are real Fal generations, not stock.

### Beat 6 - generate page (5:30)
Click Generate Page. The iframe fills in with the 8-section landing page. Let it render fully before cutting.

## 3. What to highlight visually

- **One canvas, four routes** - keep cutting back to the n8n zoom-to-fit so viewers remember everything lives in a single workflow
- **The fan-out shape** - the assets branch is the only branching shape on the canvas; frame it tight when Fal runs
- **Real generations** - hover over an asset and call out it's a Fal URL, not a placeholder. The brand-colored output is the proof

## 4. Common screwups to avoid

- Forgetting to toggle the workflow Active in n8n - every webhook returns 404 and the take is dead
- Sharing the screen with API keys visible - never open a credential edit panel on camera. If you must touch credentials, do it before recording
- Recording while Kimi is rate-limited - record off-peak (early morning Pacific is safest). A 429 mid-take kills the cut
- Fal credit exhausted - top up before recording. A failed asset shows as an empty slot
- Browser autofill popping up over the URL input - incognito avoids this
- Screen recorder capturing notification banners - DND on, Slack quit

## 5. Post-production

### Suggested chapters
- 0:00 - Decode
- 2:30 - Design
- 4:00 - Assets
- 5:30 - Generate Page

### Background music
DD faceless format - no copyrighted tracks. Pull from the standard DD royalty-free library. Keep it under -18dB so the voiceover sits on top.

### Lower-thirds
Drop a service callout the moment each appears on screen:
- Beat 3 - `Firecrawl` lower-third when the scrape result lands
- Beat 3/4 - `Kimi K2.6` lower-third on the first Kimi response
- Beat 5 - `Fal AI` lower-third as the first image paints

### Other notes
- Keep cuts tight - any dead air over 1.5s gets trimmed
- Color-correct the n8n canvas screenshots if the dark theme reads muddy after compression
- Export at 1080p minimum, 60fps if the screen recorder allows
