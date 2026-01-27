#!/bin/bash
echo "=== MIMIC Diagnosis Start ==="
echo "Timestamp: $(date)"

# 1. Check Build Status
echo -e "\n[1] Checking Build..."
if npm run compile --silent; then
    echo "✅ Build Successful"
else
    echo "❌ Build FAILED. Check terminal output for TS errors."
fi

# 2. Check Event Log Size
EVENTS_FILE="$HOME/.mimic/events.jsonl"
if [ -f "$EVENTS_FILE" ]; then
    SIZE=$(du -h "$EVENTS_FILE" | cut -f1)
    echo -e "\n[2] Event Log Size: $SIZE ($EVENTS_FILE)"
    TAIL=$(tail -n 1 "$EVENTS_FILE")
    echo "    Last Event: $TAIL"
else
    echo -e "\n[2] Event Log: NOT FOUND (Real-time perception might be off)"
fi

# 3. Check Zsh Hook
echo -e "\n[3] Checking .zshrc hook..."
if grep -q "mimic-zsh.sh" "$HOME/.zshrc"; then
    echo "✅ Hook found in .zshrc"
else
    echo "⚠️ Hook NOT found in .zshrc"
fi

echo -e "\n=== Diagnosis Complete ==="
