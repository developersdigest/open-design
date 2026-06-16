# ----------------------------------------------------------------------------
# demo.tape — VHS recording of the Open Design n8n smoke test pipeline.
#
# How to run:
#   1. Install VHS:        brew install vhs
#   2. From repo root:     vhs docs/demo.tape
#   3. Output written to:  docs/demo.gif
#
# Prereqs for an actual recording:
#   - n8n stack running (make up) so http://localhost:5678 is live
#   - The brand workflow imported and activated
#   - A sidecar API on http://localhost:3000 exposing /api/health
# ----------------------------------------------------------------------------

Output docs/demo.gif

Set Theme "Catppuccin Mocha"
Set FontSize 14
Set Width 1200
Set Height 600
Set Padding 20
Set TypingSpeed 40ms

# Settle the prompt before we start typing.
Sleep 800ms

# 1. Run the smoke test against all 4 brand webhooks.
Type "make smoke"
Enter
Sleep 12s

# 2. Quick health check on the sidecar API.
Type "curl -s http://localhost:3000/api/health | jq"
Enter
Sleep 3s

# 3. Seed sample brand runs so the UI has data to show.
Type "make seed"
Enter
Sleep 8s
