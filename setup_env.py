#!/usr/bin/env python3
"""
Environment setup helper for Cloudflare KV upload script.
This script helps users configure their Cloudflare credentials and test the connection.
"""

import os
import json
import getpass
import subprocess
import sys
from pathlib import Path


def get_cloudflare_credentials():
    """Interactive prompt to get Cloudflare credentials."""
    print("Cloudflare KV Upload - Environment Setup")
    print("=" * 50)
    
    # Check if .env file exists
    env_file = Path(".env")
    config_file = Path("config.json")
    
    if env_file.exists() or config_file.exists():
        print("⚠️  Existing configuration found!")
        if input("Do you want to overwrite? (y/N): ").lower() != 'y':
            print("Setup cancelled.")
            return
    
    print("\nTo use this script, you need:")
    print("1. A Cloudflare API token with KV permissions")
    print("2. Your Cloudflare Account ID")
    print("3. A KV namespace ID (or create one)")
    print()
    
    # Get credentials
    account_id = input("Enter your Cloudflare Account ID: ").strip()
    api_token = getpass.getpass("Enter your Cloudflare API token: ").strip()
    
    # Test API connection
    print("\nTesting API connection...")
    if not test_api_connection(account_id, api_token):
        print("❌ API connection failed. Please check your credentials.")
        return
    
    # Get namespace info
    print("\nAvailable KV namespaces:")
    namespaces = get_kv_namespaces(account_id, api_token)
    
    if namespaces:
        print("Found existing namespaces:")
        for i, ns in enumerate(namespaces, 1):
            print(f"  {i}. {ns['title']} (ID: {ns['id']})")
        
        choice = input("\nSelect a namespace (number) or press Enter to create a new one: ").strip()
        
        if choice.isdigit() and 1 <= int(choice) <= len(namespaces):
            namespace_id = namespaces[int(choice) - 1]['id']
            namespace_title = namespaces[int(choice) - 1]['title']
        else:
            namespace_title = input("Enter new namespace title: ").strip()
            namespace_id = create_kv_namespace(account_id, api_token, namespace_title)
    else:
        print("No existing namespaces found.")
        namespace_title = input("Enter new namespace title: ").strip()
        namespace_id = create_kv_namespace(account_id, api_token, namespace_title)
    
    if not namespace_id:
        print("❌ Failed to get or create namespace.")
        return
    
    # Save configuration
    config = {
        "account_id": account_id,
        "api_token": api_token,
        "namespace_id": namespace_id,
        "namespace_title": namespace_title
    }
    
    # Choose save format
    print("\nSave configuration as:")
    print("1. .env file (for environment variables)")
    print("2. config.json (for direct configuration)")
    print("3. Both")
    
    save_choice = input("Choose format (1-3): ").strip()
    
    if save_choice in ['1', '3']:
        save_env_file(config)
    
    if save_choice in ['2', '3']:
        save_config_file(config)
    
    # Update wrangler.jsonc if it exists
    if Path("wrangler.jsonc").exists():
        update_wrangler_config(namespace_id)
    
    print("\n✅ Configuration saved successfully!")
    print(f"Namespace: {namespace_title} (ID: {namespace_id})")
    
    return config


def test_api_connection(account_id: str, api_token: str) -> bool:
    """Test Cloudflare API connection."""
    try:
        import requests
        
        url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}"
        headers = {"Authorization": f"Bearer {api_token}"}
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                account_name = data.get("result", {}).get("name", "Unknown")
                print(f"✅ Connected to account: {account_name}")
                return True
            else:
                print(f"❌ API error: {data.get('errors', [{}])[0].get('message', 'Unknown error')}")
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            
    except ImportError:
        print("❌ 'requests' library not installed. Install with: pip install requests")
    except Exception as e:
        print(f"❌ Connection error: {e}")
    
    return False


def get_kv_namespaces(account_id: str, api_token: str) -> list:
    """Get list of existing KV namespaces."""
    try:
        import requests
        
        url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces"
        headers = {"Authorization": f"Bearer {api_token}"}
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                return data.get("result", [])
        
    except Exception as e:
        print(f"Error fetching namespaces: {e}")
    
    return []


def create_kv_namespace(account_id: str, api_token: str, title: str) -> str:
    """Create a new KV namespace."""
    try:
        import requests
        
        print(f"Creating namespace: {title}")
        
        url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces"
        headers = {"Authorization": f"Bearer {api_token}"}
        data = {"title": title}
        
        response = requests.post(url, headers=headers, json=data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                namespace_id = result.get("result", {}).get("id")
                print(f"✅ Created namespace: {title} (ID: {namespace_id})")
                return namespace_id
            else:
                error_msg = result.get("errors", [{}])[0].get("message", "Unknown error")
                print(f"❌ Failed to create namespace: {error_msg}")
        else:
            print(f"❌ HTTP {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"Error creating namespace: {e}")
    
    return ""


def save_env_file(config: dict):
    """Save configuration to .env file."""
    env_content = f"""# Cloudflare KV Configuration
export CF_ACCOUNT_ID="{config['account_id']}"
export CF_API_TOKEN="{config['api_token']}"
export CF_NAMESPACE_ID="{config['namespace_id']}"
"""
    
    with open(".env", "w") as f:
        f.write(env_content)
    
    print("📄 Saved .env file")


def save_config_file(config: dict):
    """Save configuration to config.json file."""
    with open("config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("📄 Saved config.json file")


def update_wrangler_config(namespace_id: str):
    """Update wrangler.jsonc with the namespace ID."""
    try:
        import json
        
        with open("wrangler.jsonc", "r") as f:
            content = f.read()
        
        # Parse JSONC (handle comments)
        # For simplicity, we'll just update if it's valid JSON
        try:
            config = json.loads(content)
            updated = False
            
            if "kv_namespaces" not in config:
                config["kv_namespaces"] = []
            
            # Find or create KV namespace configuration
            kv_found = False
            for ns in config["kv_namespaces"]:
                if ns.get("binding") == "KV":
                    ns["id"] = namespace_id
                    kv_found = True
                    updated = True
                    break
            
            if not kv_found:
                config["kv_namespaces"].append({
                    "binding": "KV",
                    "id": namespace_id,
                    "preview_id": "<PREVIEW_ID_FOR_LOCAL_DEVELOPMENT>"
                })
                updated = True
            
            if updated:
                with open("wrangler.jsonc", "w") as f:
                    json.dump(config, f, indent=2)
                print("📄 Updated wrangler.jsonc with namespace ID")
            
        except json.JSONDecodeError:
            print("⚠️  wrangler.jsonc contains comments or invalid JSON. Please update manually.")
            
    except Exception as e:
        print(f"⚠️  Could not update wrangler.jsonc: {e}")


def show_usage_examples():
    """Show usage examples."""
    print("\nUsage Examples:")
    print("=" * 50)
    
    # Check if config exists
    if Path("config.json").exists():
        with open("config.json") as f:
            config = json.load(f)
        
        print("1. Using saved configuration:")
        print(f"   python upload_to_kv.py --csv leetcode_problems.csv \\")
        print(f"     --account-id {config['account_id']} \\")
        print(f"     --api-token {config['api_token']} \\")
        print(f"     --namespace-id {config['namespace_id']}")
    
    print("\n2. Using environment variables:")
    print("   source .env  # or set them manually")
    print("   python upload_to_kv.py --csv leetcode_problems.csv \\")
    print("     --account-id $CF_ACCOUNT_ID \\")
    print("     --api-token $CF_API_TOKEN \\")
    print("     --namespace-id $CF_NAMESPACE_ID")
    
    print("\n3. Using the test script:")
    print("   python test_upload.py leetcode_problems.csv 10")


def main():
    """Main function."""
    if len(sys.argv) > 1 and sys.argv[1] in ['--help', '-h']:
        print("Cloudflare KV Environment Setup")
        print("Usage: python setup_env.py")
        print("       python setup_env.py --examples")
        return
    
    if len(sys.argv) > 1 and sys.argv[1] == "--examples":
        show_usage_examples()
        return
    
    # Check for required dependencies
    try:
        import requests
    except ImportError:
        print("❌ 'requests' library not found. Install with: pip install requests")
        sys.exit(1)
    
    # Run setup
    config = get_cloudflare_credentials()
    
    if config:
        show_usage_examples()


if __name__ == "__main__":
    main()