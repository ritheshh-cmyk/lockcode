import subprocess
import json
import sys
import configparser

def test_final_py():
    print("Reading gemini.ini...")
    config = configparser.ConfigParser()
    config.read('gemini.ini')
    
    # Parse multi-line API keys
    raw_keys = config.get('gemini', 'api_keys', fallback='')
    keys_list = [k.strip() for k in raw_keys.replace('\n', ',').split(',') if k.strip()]
    keys_str = ",".join(keys_list)

    # This exactly mimics how your real launcher creates a RAM stdin pipe
    payload = {
        "gemini_key": keys_str,
        "model": "gemini",
        "language": config.get('prompts', 'coding_language', fallback='Java'),
    }
    
    print(f"Launching final.py with language: {payload['language']} and {len(keys_list)} keys...")
    
    try:
        process = subprocess.Popen(
            [sys.executable, "final.py"],
            stdin=subprocess.PIPE,
            text=True
        )
        
        # Pass the payload directly through the RAM pipe, no echo cmd
        process.communicate(json.dumps(payload))
        
    except KeyboardInterrupt:
        print("\nTest stopped.")

if __name__ == "__main__":
    test_final_py()
