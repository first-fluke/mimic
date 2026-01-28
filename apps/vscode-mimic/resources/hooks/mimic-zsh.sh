#!/bin/zsh
# MIMIC Shell Hook for Real-time Perception
# Installs into ~/.zshrc to log terminal commands instantly

# === Configuration ===
MIMIC_EVENTS_FILE="${HOME}/.mimic/events.jsonl"
MIMIC_DIR="${HOME}/.mimic"

# Ensure the directory exists
[[ -d "$MIMIC_DIR" ]] || mkdir -p "$MIMIC_DIR"

# === State Variables ===
__mimic_cmd_start_time=""
__mimic_last_cmd=""

# === Hooks ===

# preexec: Called BEFORE a command is executed
__mimic_preexec() {
    __mimic_last_cmd="$1"
    __mimic_cmd_start_time=$(date +%s)
}

# precmd: Called AFTER a command finishes, BEFORE the next prompt
__mimic_precmd() {
    local exit_code=$?
    local end_time=$(date +%s)

    # Skip if no command was recorded
    [[ -z "$__mimic_last_cmd" ]] && return

    # Skip empty or whitespace-only commands
    [[ "$__mimic_last_cmd" =~ ^[[:space:]]*$ ]] && return

    # Calculate duration
    local duration=0
    local current_time=$(date +%s)
    if [[ -n "$__mimic_cmd_start_time" ]]; then
        duration=$((current_time - __mimic_cmd_start_time))
    fi

    # Escape JSON special characters (backslashes and quotes)
    # Zsh parameter expansion replacement: ${var//pattern/replacement}
    local safe_cmd="${__mimic_last_cmd//\\/\\\\}" # Escape backslashes first
    safe_cmd="${safe_cmd//\"/\\\"}"             # Escape quotes
    
    # Handle newlines? (Simple replacement)
    # For now, let's keep it simple. Multiline commands might break JSONL if not careful.
    
    # Write JSON line to events file
    # Use >> append immediately to minimalize locking issues (though shell append is usually atomic enough for this)
    echo "{\"ts\":$current_time,\"cmd\":\"$safe_cmd\",\"cwd\":\"$PWD\",\"exit\":$exit_code,\"dur\":$duration}" >> "$MIMIC_EVENTS_FILE"

    # Reset state
    __mimic_last_cmd=""
    __mimic_cmd_start_time=""
}

# === Registration ===
# Only add hooks if not already registered
if [[ ! "$preexec_functions" =~ "__mimic_preexec" ]]; then
    preexec_functions+=(__mimic_preexec)
fi

if [[ ! "$precmd_functions" =~ "__mimic_precmd" ]]; then
    precmd_functions+=(__mimic_precmd)
fi

echo "[MIMIC] Shell hooks activated. Events logged to $MIMIC_EVENTS_FILE"
