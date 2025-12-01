#!/usr/bin/env python3
"""
Cloudflare KV Upload Script for LeetCode Problems

This script parses a CSV or JSON file containing coding question data and uploads
the resulting data into a Cloudflare KV database for fast access by Workers.

Usage:
    python upload_to_kv.py --csv leetcode_problems.csv --account-id YOUR_ACCOUNT_ID --api-token YOUR_API_TOKEN

Requirements:
    - requests library (pip install requests)
    - Cloudflare API token with KV permissions
"""

import argparse
import asyncio
import csv
import json
import logging
import os
import sys
import time
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus

import requests
from tqdm import tqdm

class CloudflareKVUploader:
    """Handles uploading data to Cloudflare KV using the REST API."""
    
    def __init__(self, account_id: str, api_token: str, namespace_id: str):
        """
        Initialize the Cloudflare KV uploader.
        
        Args:
            account_id: Cloudflare account ID
            api_token: Cloudflare API token with KV permissions
            namespace_id: KV namespace ID
        """
        self.account_id = account_id
        self.api_token = api_token
        self.namespace_id = namespace_id
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}"
        
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/octet-stream"
        }
    
    def put(self, key: str, value: str) -> bool:
        """
        Put a key-value pair into Cloudflare KV.
        
        Args:
            key: The key to store
            value: The value to store (as JSON string)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            url = f"{self.base_url}/values/{quote_plus(key)}"
            response = requests.put(url, headers=self.headers, data=value)
            
            if response.status_code in [200, 201]:
                return True
            else:
                logging.error(f"Failed to upload key {key}: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logging.error(f"Exception uploading key {key}: {str(e)}")
            return False
    
    def put_bulk(self, entries: List[Dict[str, str]]) -> Dict[str, int]:
        """
        Upload multiple key-value pairs to Cloudflare KV using bulk API.
        
        Args:
            entries: List of dictionaries with 'key' and 'value' keys
            
        Returns:
            Dictionary with 'success' and 'failed' counts
        """
        results = {"success": 0, "failed": 0}
        
        try:
            # Cloudflare KV bulk API expects the format: [{"key": "...", "value": "..."}]
            # But we'll use individual PUT requests for better error handling
            for entry in entries:
                try:
                    url = f"{self.base_url}/values/{quote_plus(entry['key'])}"
                    response = requests.put(url, headers=self.headers, data=entry["value"])
                    
                    if response.status_code in [200, 201]:
                        results["success"] += 1
                    else:
                        logging.error(f"Failed to upload key {entry['key']}: {response.status_code} - {response.text}")
                        results["failed"] += 1
                        
                except Exception as e:
                    logging.error(f"Exception uploading key {entry['key']}: {str(e)}")
                    results["failed"] += 1
            
            return results
            
        except Exception as e:
            logging.error(f"Exception in bulk upload: {str(e)}")
            results["failed"] = len(entries)
            return results


def should_process_problem(problem_id: int) -> bool:
    """
    Determine if a problem should be processed based on filtering rules.
    
    Rules:
    - Process ID 1262
    - Process IDs >= 1931
    """
    if problem_id == 1262:
        return True
    if problem_id >= 1931:
        return True
    return False


def parse_csv_row(row: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """
    Parse a single CSV row into a structured problem dictionary.
    
    Args:
        row: Dictionary representing a CSV row
        
    Returns:
        Parsed problem dictionary or None if invalid
    """
    try:
        # Extract basic fields
        frontend_question_id = row.get('frontendQuestionId', '').strip()
        if not frontend_question_id:
            return None
        
        problem_id = int(frontend_question_id)
        if not should_process_problem(problem_id):
            return None
        
        # Parse topics from string to list
        topics_str = row.get('topics', '').strip()
        topics = []
        if topics_str:
            # Remove brackets and split by comma
            topics = [topic.strip().strip('"') for topic in topics_str.strip('[]').split(',') if topic.strip()]
        
        # Parse hints from string to list
        hints_str = row.get('hints', '').strip()
        hints = []
        if hints_str:
            # Remove brackets and split by comma
            hints = [hint.strip().strip('"') for hint in hints_str.strip('[]').split(',') if hint.strip()]
        
        # Parse similar_questions from string to list
        similar_questions_str = row.get('similar_questions', '').strip()
        similar_questions = []
        if similar_questions_str:
            # Remove brackets and split by comma
            similar_questions = [q.strip().strip('"') for q in similar_questions_str.strip('[]').split(',') if q.strip()]
        
        # Parse acceptance rate
        acceptance_rate = None
        acceptance_rate_str = row.get('acceptance_rate', '').strip()
        if acceptance_rate_str:
            try:
                acceptance_rate = float(acceptance_rate_str.replace('%', '').strip())
            except ValueError:
                pass
        
        # Parse likes and dislikes
        likes = 0
        dislikes = 0
        try:
            likes = int(row.get('likes', '0').strip()) if row.get('likes', '').strip() else 0
        except ValueError:
            pass
        
        try:
            dislikes = int(row.get('dislikes', '0').strip()) if row.get('dislikes', '').strip() else 0
        except ValueError:
            pass
        
        # Create the problem dictionary
        problem = {
            "id": problem_id,
            "difficulty": row.get('difficulty', '').strip(),
            "title": row.get('title', '').strip(),
            "titleSlug": row.get('titleSlug', '').strip(),
            "url": row.get('url', '').strip(),
            "description": row.get('description', '').strip(),
        }
        
        # Add solution codes if they exist
        solution_codes = {}
        for lang in ['python', 'java', 'cpp']:
            code_key = f'solution_code_{lang}'
            if code_key in row and row[code_key]:
                solution_codes[f'solution_code_{lang}'] = row[code_key]
        
        if solution_codes:
            problem.update(solution_codes)
        
        # Add metadata
        metadata = {
            "category": row.get('category', '').strip(),
            "topics": topics,
            "hints": hints,
            "acceptance_rate": acceptance_rate,
            "likes": likes,
            "dislikes": dislikes,
        }
        
        # Add similar_questions if present
        if similar_questions:
            metadata["similar_questions"] = similar_questions
        
        # Add any other metadata fields that might be present
        for key, value in row.items():
            if key not in ['difficulty', 'frontendQuestionId', 'paidOnly', 'title', 'titleSlug', 'url', 
                          'description_url', 'description', 'solution_url', 'solution', 
                          'solution_code_python', 'solution_code_java', 'solution_code_cpp', 
                          'solution_code_url', 'category', 'acceptance_rate', 'topics', 
                          'hints', 'likes', 'dislikes', 'similar_questions', 'stats']:
                if value and value.strip():
                    metadata[key] = value.strip()
        
        if metadata:
            problem["metadata"] = metadata
        
        return problem
        
    except Exception as e:
        logging.error(f"Error parsing row: {str(e)}")
        return None


def parse_json_problem(json_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Parse a JSON problem entry into a structured problem dictionary.
    """
    try:
        question_id = json_data.get('questionId')
        if not question_id:
            return None
            
        problem_id = int(question_id)
        if not should_process_problem(problem_id):
            return None
            
        problem = {
            "id": problem_id,
            "difficulty": json_data.get('difficulty', ''),
            "title": json_data.get('title', ''),
            "titleSlug": json_data.get('titleSlug', ''),
            "url": json_data.get('url', ''),
            "description": json_data.get('description', ''),
            "metadata": {
                "topics": json_data.get('topics', []),
                "category": json_data.get('category', 'General')
            }
        }
        return problem
    except Exception as e:
        logging.error(f"Error parsing JSON problem: {str(e)}")
        return None


def create_essentials_entry(problems: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Create the essentials entry containing basic info for all problems.
    
    Args:
        problems: List of parsed problem dictionaries
        
    Returns:
        Essentials dictionary
    """
    essentials = []
    
    for problem in problems:
        essential = {
            "id": problem["id"],
            "title": problem["title"],
            "difficulty": problem["difficulty"],
            "category": problem.get("metadata", {}).get("category", ""),
            "topics": problem.get("metadata", {}).get("topics", [])
        }
        essentials.append(essential)
    
    # Sort by ID for consistent ordering
    essentials.sort(key=lambda x: x["id"])
    
    return {
        "problems": essentials,
        "count": len(essentials),
        "last_updated": None  # Will be set when uploaded
    }


def upload_file_to_kv(file_path: str, kv_uploader: CloudflareKVUploader, batch_size: int = 50, skip_essentials: bool = False):
    """
    Main function to upload data to Cloudflare KV.
    
    Args:
        file_path: Path to the CSV or JSON file
        kv_uploader: CloudflareKVUploader instance
        batch_size: Number of entries to upload in each batch
        skip_essentials: Whether to skip uploading the essentials entry
    """
    logging.info(f"Starting upload from {file_path}")
    
    problems = []
    processed_count = 0
    success_count = 0
    failed_count = 0
    
    # Read and parse data
    logging.info("Reading and parsing data...")
    
    if file_path.endswith('.json'):
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            # Handle both list of problems or object with "problems" key
            if isinstance(data, dict) and "problems" in data:
                raw_problems = data["problems"]
            elif isinstance(data, list):
                raw_problems = data
            else:
                logging.error("Invalid JSON format. Expected list or object with 'problems' key.")
                return 0, 0
                
            for p in raw_problems:
                problem = parse_json_problem(p)
                if problem:
                    problems.append(problem)
                processed_count += 1
    else:
        with open(file_path, 'r', encoding='utf-8', newline='') as file:
            reader = csv.DictReader(file)
            for row in reader:
                problem = parse_csv_row(row)
                if problem:
                    problems.append(problem)
                processed_count += 1
                if processed_count % 1000 == 0:
                    logging.info(f"Processed {processed_count} rows...")
    
    logging.info(f"Successfully parsed {len(problems)} problems from {processed_count} rows")
    
    if not problems:
        logging.warning("No problems found matching criteria.")
        return 0, 0

    # Upload individual problem entries
    logging.info("Uploading individual problem entries...")
    with tqdm(total=len(problems), desc="Uploading problems") as pbar:
        for i in range(0, len(problems), batch_size):
            batch = problems[i:i + batch_size]
            entries = []
            
            for problem in batch:
                key = f"problem:{problem['id']}"
                value = json.dumps(problem, ensure_ascii=False, separators=(',', ':'))
                entries.append({"key": key, "value": value})
            
            result = kv_uploader.put_bulk(entries)
            success_count += result["success"]
            failed_count += result["failed"]
            
            pbar.update(len(batch))
    
    # Upload essentials entry
    if not skip_essentials:
        logging.info("Uploading essentials entry...")
        essentials = create_essentials_entry(problems)
        essentials["last_updated"] = str(int(time.time()))
        
        essentials_key = "essentials"
        essentials_value = json.dumps(essentials, ensure_ascii=False, separators=(',', ':'))
        
        if kv_uploader.put(essentials_key, essentials_value):
            logging.info("Successfully uploaded essentials entry")
            success_count += 1
        else:
            logging.error("Failed to upload essentials entry")
            failed_count += 1
    else:
        logging.info("Skipping essentials entry upload as requested.")
    
    return success_count, failed_count


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Upload LeetCode problems to Cloudflare KV')
    parser.add_argument('--csv', required=True, help='Path to the CSV or JSON file')
    parser.add_argument('--account-id', required=True, help='Cloudflare account ID')
    parser.add_argument('--api-token', required=True, help='Cloudflare API token')
    parser.add_argument('--namespace-id', required=True, help='KV namespace ID')
    parser.add_argument('--batch-size', type=int, default=50, help='Batch size for uploads (default: 50)')
    parser.add_argument('--skip-essentials', action='store_true', help='Skip uploading the essentials index')
    parser.add_argument('--log-level', default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       help='Logging level (default: INFO)')
    
    args = parser.parse_args()
    
    # Setup logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('upload.log')
        ]
    )
    
    # Validate inputs
    if not os.path.exists(args.csv):
        logging.error(f"File not found: {args.csv}")
        sys.exit(1)
    
    # Initialize KV uploader
    kv_uploader = CloudflareKVUploader(args.account_id, args.api_token, args.namespace_id)
    
    try:
        # Upload data
        success_count, failed_count = upload_file_to_kv(args.csv, kv_uploader, args.batch_size, args.skip_essentials)
        
        # Print summary
        logging.info("=" * 50)
        logging.info("UPLOAD SUMMARY")
        logging.info("=" * 50)
        logging.info(f"Total problems processed: {success_count + failed_count}")
        logging.info(f"Successful uploads: {success_count}")
        logging.info(f"Failed uploads: {failed_count}")
        if success_count + failed_count > 0:
            logging.info(f"Success rate: {(success_count / (success_count + failed_count) * 100):.1f}%")
        logging.info("=" * 50)
        
        if failed_count == 0:
            logging.info("✅ All uploads completed successfully!")
        else:
            logging.warning(f"⚠️  {failed_count} uploads failed. Check upload.log for details.")
    
    except Exception as e:
        logging.error(f"Fatal error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()