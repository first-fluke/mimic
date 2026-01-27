#!/bin/bash
echo "=== MIMIC Shell Hook QA Test ==="

# 1. Define a unique test command
TEST_CMD="echo MIMIC_QA_Probe_$(date +%s)"

# 2. Execute it (This should trigger the hook if installed)
eval "$TEST_CMD"

# 3. Wait a moment for async write
sleep 1

# 4. Check the log file
EVENTS_FILE="$HOME/.mimic/events.jsonl"
if [ ! -f "$EVENTS_FILE" ]; then
    echo "❌ Error: events.jsonl does not exist!"
    exit 1
fi

# 5. Verify presence
if grep -q "MIMIC_QA_Probe" "$EVENTS_FILE"; then
    echo "✅ PASS: Shell hook is working! Command captured."
    tail -n 1 "$EVENTS_FILE"
else
    echo "❌ FAIL: Command executed but NOT found in logs."
    echo "   Check if 'mimic.enableRealtimePerception' is TRUE and terminal was restarted."
fi
