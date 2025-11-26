#!/usr/bin/env python3
"""
Complete Cloudflare KV Upload Solution for LeetCode Problems

This is the main orchestration script that combines all functionality:
- Environment setup
- Data validation
- CSV upload to KV
- Basic testing of the uploaded data

Usage:
    python cloudinterview_upload.py [command] [options]

Commands:
    setup       - Setup Cloudflare credentials and KV namespace
    test        - Test CSV parsing and data validation
    upload      - Upload CSV data to Cloudflare KV
    full        - Run setup, test, and upload in sequence
    examples    - Show usage examples
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


def run_command(command: str, description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {command}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(command, shell=True, check=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False
    except Exception as e:
        print(f"❌ {description} failed with error: {e}")
        return False


def check_prerequisites():
    """Check if all prerequisites are installed."""
    print("Checking prerequisites...")
    
    # Check Python version
    if sys.version_info < (3, 7):
        print("❌ Python 3.7+ required")
        return False
    
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    
    # Check if requirements are installed
    try:
        import requests
        import tqdm
        print("✅ Required Python packages installed")
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("Install with: pip install -r requirements.txt")
        return False
    
    return True


def main():
    """Main orchestration function."""
    parser = argparse.ArgumentParser(
        description='Complete Cloudflare KV Upload Solution for LeetCode Problems',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cloudinterview_upload.py setup
  python cloudinterview_upload.py test leetcode_problems.csv
  python cloudinterview_upload.py upload leetcode_problems.csv
  python cloudinterview_upload.py full leetcode_problems.csv
  python cloudinterview_upload.py examples
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Setup command
    setup_parser = subparsers.add_parser('setup', help='Setup Cloudflare credentials and KV namespace')
    setup_parser.add_argument('--force', action='store_true', help='Force setup even if config exists')
    
    # Test command
    test_parser = subparsers.add_parser('test', help='Test CSV parsing and data validation')
    test_parser.add_argument('csv_file', help='Path to CSV file')
    test_parser.add_argument('--sample-size', type=int, default=10, help='Number of rows to test (default: 10)')
    
    # Upload command
    upload_parser = subparsers.add_parser('upload', help='Upload CSV data to Cloudflare KV')
    upload_parser.add_argument('csv_file', help='Path to CSV file')
    upload_parser.add_argument('--account-id', help='Cloudflare account ID')
    upload_parser.add_argument('--api-token', help='Cloudflare API token')
    upload_parser.add_argument('--namespace-id', help='KV namespace ID')
    upload_parser.add_argument('--batch-size', type=int, default=50, help='Batch size for uploads (default: 50)')
    upload_parser.add_argument('--skip-tests', action='store_true', help='Skip validation tests')
    
    # Full command
    full_parser = subparsers.add_parser('full', help='Run setup, test, and upload in sequence')
    full_parser.add_argument('csv_file', help='Path to CSV file')
    full_parser.add_argument('--batch-size', type=int, default=50, help='Batch size for uploads (default: 50)')
    
    # Examples command
    subparsers.add_parser('examples', help='Show usage examples')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Check prerequisites
    if not check_prerequisites():
        sys.exit(1)
    
    # Handle each command
    if args.command == 'setup':
        print("Setting up Cloudflare credentials and KV namespace...")
        print("This will guide you through:")
        print("- Creating/validating your API token")
        print("- Setting up a KV namespace")
        print("- Saving configuration to config.json and .env files")
        print()
        
        cmd = 'python setup_env.py'
        if args.force:
            cmd += ' --force'
        success = run_command(cmd, "Environment Setup")
        
        if success:
            print("\n✅ Setup completed! Configuration saved to:")
            print("- config.json (for direct use)")
            print("- .env (for environment variables)")
            print("\nYou can now run:")
            print(f"python cloudinterview_upload.py full {args.csv_file if hasattr(args, 'csv_file') else 'your_file.csv'}")
        
    elif args.command == 'test':
        if not Path(args.csv_file).exists():
            print(f"❌ CSV file not found: {args.csv_file}")
            sys.exit(1)
        
        cmd = f'python test_upload.py {args.csv_file} {args.sample_size}'
        success = run_command(cmd, "CSV Data Validation")
        
    elif args.command == 'upload':
        if not Path(args.csv_file).exists():
            print(f"❌ CSV file not found: {args.csv_file}")
            sys.exit(1)
        
        # Check for saved configuration if not provided via command line
        env_file = Path(".env")
        config = {}
        
        if env_file.exists() and not (args.account_id and args.api_token and args.namespace_id):
            try:
                # Read environment variables from .env file
                with open(env_file) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('#') or not line:
                            continue
                        if '=' in line:
                            key, value = line.split('=', 1)
                            # Remove export prefix and quotes
                            key = key.replace('export ', '').strip()
                            value = value.strip().strip('"').strip("'")
                            config[key] = value
                
                # Map .env variables to expected keys
                if 'CF_ACCOUNT_ID' in config:
                    config['account_id'] = config['CF_ACCOUNT_ID']
                if 'CF_API_TOKEN' in config:
                    config['api_token'] = config['CF_API_TOKEN']
                if 'CF_NAMESPACE_ID' in config:
                    config['namespace_id'] = config['CF_NAMESPACE_ID']
                
                print("✅ Using saved configuration from .env")
            except Exception as e:
                print(f"⚠️  Error reading configuration: {e}")
                print("Please provide credentials manually or run setup again.")
        
        # Build upload command
        cmd = f'python upload_to_kv.py --csv {args.csv_file} --batch-size {args.batch_size}'
        
        # Use saved config or command line arguments
        if args.account_id:
            cmd += f' --account-id {args.account_id}'
        elif config.get('account_id'):
            cmd += f' --account-id {config["account_id"]}'
        
        if args.api_token:
            cmd += f' --api-token {args.api_token}'
        elif config.get('api_token'):
            cmd += f' --api-token {config["api_token"]}'
        
        if args.namespace_id:
            cmd += f' --namespace-id {args.namespace_id}'
        elif config.get('namespace_id'):
            cmd += f' --namespace-id {config["namespace_id"]}'
        
        # Check if all required arguments are provided
        has_account_id = args.account_id or config.get('account_id')
        has_api_token = args.api_token or config.get('api_token')
        has_namespace_id = args.namespace_id or config.get('namespace_id')
        
        if not (has_account_id and has_api_token and has_namespace_id):
            print("❌ Missing required credentials.")
            print("Please provide all of: --account-id, --api-token, --namespace-id")
            print("Or run setup first: python cloudinterview_upload.py setup")
            sys.exit(1)
        
        success = run_command(cmd, "CSV Upload to KV")
        
    elif args.command == 'full':
        if not Path(args.csv_file).exists():
            print(f"❌ CSV file not found: {args.csv_file}")
            sys.exit(1)
        
        # Run setup
        success = run_command('python setup_env.py', "Environment Setup")
        if not success:
            print("❌ Setup failed. Cannot continue.")
            sys.exit(1)
        
        # Run test
        success = run_command(f'python test_upload.py {args.csv_file} 20', "CSV Data Validation")
        if not success:
            print("❌ Validation failed. Cannot continue.")
            sys.exit(1)
        
        # Check for saved configuration
        env_file = Path(".env")
        
        if env_file.exists():
            # Read environment variables from .env file
            try:
                config = {}
                with open(env_file) as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('#') or not line:
                            continue
                        if '=' in line:
                            key, value = line.split('=', 1)
                            # Remove export prefix and quotes
                            key = key.replace('export ', '').strip()
                            value = value.strip().strip('"').strip("'")
                            config[key] = value
                
                # Map .env variables to expected keys
                account_id = config.get('CF_ACCOUNT_ID')
                api_token = config.get('CF_API_TOKEN')
                namespace_id = config.get('CF_NAMESPACE_ID')
                
                if account_id and api_token and namespace_id:
                    cmd = f'python upload_to_kv.py --csv {args.csv_file} --batch-size {args.batch_size} ' \
                          f'--account-id {account_id} --api-token {api_token} --namespace-id {namespace_id}'
                    success = run_command(cmd, "CSV Upload to KV")
                else:
                    print("❌ Incomplete configuration found in .env file.")
                    print("Please run setup again or provide credentials manually.")
                    sys.exit(1)
                
            except Exception as e:
                print(f"❌ Error reading configuration: {e}")
                print("Please run setup again or provide credentials manually.")
                sys.exit(1)
        else:
            print("❌ No saved configuration found.")
            print("Please run setup again or use the upload command with manual credentials:")
            print(f"python cloudinterview_upload.py upload {args.csv_file} --account-id YOUR_ID --api-token YOUR_TOKEN --namespace-id YOUR_NAMESPACE")
            sys.exit(1)
        
    elif args.command == 'examples':
        print("""
Cloudflare KV Upload Solution - Usage Examples
================================================

1. Quick Start (Full Setup):
   python cloudinterview_upload.py full leetcode_problems.csv

2. Step by Step:
   
   a) Setup Cloudflare credentials:
      python cloudinterview_upload.py setup
   
   b) Test data validation:
      python cloudinterview_upload.py test leetcode_problems.csv --sample-size 50
   
   c) Upload data:
      python cloudinterview_upload.py upload leetcode_problems.csv --batch-size 100

3. Using Environment Variables:
   # Set environment variables
   export CF_ACCOUNT_ID="your_account_id"
   export CF_API_TOKEN="your_api_token"
   export CF_NAMESPACE_ID="your_namespace_id"
   
   # Upload with env vars
   python cloudinterview_upload.py upload leetcode_problems.csv

4. Using Saved Configuration:
   # After running setup, config is saved to config.json
   python cloudinterview_upload.py upload leetcode_problems.csv

5. Custom API Credentials:
   python cloudinterview_upload.py upload leetcode_problems.csv \\
     --account-id YOUR_ACCOUNT_ID \\
     --api-token YOUR_API_TOKEN \\
     --namespace-id YOUR_NAMESPACE_ID \\
     --batch-size 100

6. Worker Integration:
   # See src/api-example.ts for a complete Worker example
   # Deploy with: wrangler deploy

CSV File Format:
==============
The CSV should have these columns:
- difficulty, frontendQuestionId, paidOnly, title, titleSlug, url
- description_url, description, solution_url, solution
- solution_code_python, solution_code_java, solution_code_cpp, solution_code_url
- category, acceptance_rate, topics, hints, likes, dislikes, similar_questions, stats

Data Structure:
=============
Each problem is stored as:
{
  "id": 1,
  "difficulty": "Easy",
  "title": "Two Sum",
  "titleSlug": "two-sum", 
  "url": "https://leetcode.com/problems/two-sum",
  "description": "<p>Problem description...</p>",
  "solution_code_python": "class Solution:...",
  "metadata": {
    "category": "Array",
    "topics": ["Array", "Hash Table"],
    "hints": ["Use hash map"],
    "acceptance_rate": 46.2,
    "likes": 15000,
    "dislikes": 500
  }
}

Essentials Index:
===============
A global 'essentials' key contains:
{
  "problems": [
    {"id": 1, "title": "Two Sum", "difficulty": "Easy", "category": "Array", "topics": ["Array"]}
  ],
  "count": 2000,
  "last_updated": "timestamp"
}

Troubleshooting:
==============
1. API Token Issues:
   - Ensure token has KV permissions
   - Check account ID is correct
   
2. Rate Limiting:
   - Reduce batch size (--batch-size 25)
   - Add delays between batches
   
3. Memory Issues:
   - Process smaller CSV chunks
   - Increase system memory
   
4. Network Issues:
   - Check internet connection
   - Retry failed uploads
        """)
        success = True
    
    else:
        print(f"❌ Unknown command: {args.command}")
        parser.print_help()
        sys.exit(1)
    
    if success:
        print(f"\n🎉 {args.command.title()} completed successfully!")
    else:
        print(f"\n💥 {args.command.title()} failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()