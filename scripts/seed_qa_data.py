import json
import time
import os
import random

# Configuration
EVENTS_FILE = os.path.expanduser("~/.mimic/events.jsonl")
PROJECT_ROOT = "/Volumes/gahyun_ex/projects/mimic-v2"

# Simulation Data: A developer debugging and fixing a test
SCENARIO = [
    # 1. Investigation
    {"cmd": "ls -la src/services", "exit": 0, "dur": 0},
    {"cmd": "grep -r 'ActivityWatcher' src", "exit": 0, "dur": 1},
    
    # 2. Failing Tests (The Instinct Trigger)
    {"cmd": "npm test", "exit": 1, "dur": 5},
    {"cmd": "npm test", "exit": 1, "dur": 4},
    {"cmd": "cat src/services/ActivityWatcher.ts", "exit": 0, "dur": 0},
    {"cmd": "npm test", "exit": 1, "dur": 5},
    
    # 3. Fix Applied
    {"cmd": "npm run compile", "exit": 0, "dur": 10},
    {"cmd": "npm test", "exit": 0, "dur": 6},
    
    # 4. Git Workflow
    {"cmd": "git status", "exit": 0, "dur": 0},
    {"cmd": "git diff", "exit": 0, "dur": 1},
    {"cmd": "git add .", "exit": 0, "dur": 0},
    {"cmd": "git commit -m 'fix: resolve connection refused error'", "exit": 0, "dur": 2},
    {"cmd": "git push origin main", "exit": 0, "dur": 3},
    
    # 5. Some random noise to reach threshold
    {"cmd": "ls", "exit": 0, "dur": 0},
    {"cmd": "cd resources", "exit": 0, "dur": 0},
    {"cmd": "ls", "exit": 0, "dur": 0},
    {"cmd": "cd ..", "exit": 0, "dur": 0},
    {"cmd": "npm install", "exit": 0, "dur": 15},
    {"cmd": "npm audit", "exit": 0, "dur": 2},
    {"cmd": "echo 'Checking logs'", "exit": 0, "dur": 0},
    {"cmd": "tail -f ~/.mimic/events.jsonl", "exit": 130, "dur": 10}, # Ctrl+C
]

def seed_data():
    print(f"[*] Seeding dummy events to {EVENTS_FILE}...")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(EVENTS_FILE), exist_ok=True)
    
    current_ts = int(time.time()) - (len(SCENARIO) * 60) # Start from past
    
    with open(EVENTS_FILE, "a") as f:
        for step in SCENARIO:
            # Add some variability
            ts = current_ts + random.randint(1, 10)
            
            event = {
                "ts": ts,
                "cmd": step["cmd"],
                "cwd": PROJECT_ROOT,
                "exit": step["exit"],
                "dur": step["dur"]
            }
            
            f.write(json.dumps(event) + "\n")
            current_ts = ts
            
            print(f"  + Added: {step['cmd']} (exit: {step['exit']})")

    print(f"[*] Successfully added {len(SCENARIO)} events.")
    print("[*] The 'ActivityWatcher' should pick these up if the extension is active.")
    print("[*] Since we added > 20 events (cumulative), check for Insight generation.")

if __name__ == "__main__":
    seed_data()
