#!/usr/bin/env python3
"""
Test script to validate CSV parsing logic without making actual KV API calls.
"""

import csv
import json
import sys
from typing import Dict, Any, Optional
from upload_to_kv import parse_csv_row, create_essentials_entry


def test_csv_parsing(csv_file: str, sample_size: int = 5):
    """
    Test the CSV parsing functionality.
    
    Args:
        csv_file: Path to the CSV file
        sample_size: Number of rows to test
    """
    print(f"Testing CSV parsing with {sample_size} sample rows...")
    print("=" * 60)
    
    problems = []
    parsed_count = 0
    failed_count = 0
    
    try:
        with open(csv_file, 'r', encoding='utf-8', newline='') as file:
            reader = csv.DictReader(file)
            
            for i, row in enumerate(reader):
                if i >= sample_size:
                    break
                
                print(f"\n--- Row {i + 1} ---")
                print(f"Original data: {json.dumps({k: v[:100] + '...' if len(str(v)) > 100 else v for k, v in row.items()}, indent=2)}")
                
                problem = parse_csv_row(row)
                
                if problem:
                    parsed_count += 1
                    problems.append(problem)
                    print(f"✅ Parsed successfully:")
                    print(f"   ID: {problem.get('id')}")
                    print(f"   Title: {problem.get('title')}")
                    print(f"   Difficulty: {problem.get('difficulty')}")
                    print(f"   Topics: {problem.get('metadata', {}).get('topics', [])}")
                    print(f"   Has Python solution: {'solution_code_python' in problem}")
                    print(f"   JSON size: {len(json.dumps(problem, ensure_ascii=False))} bytes")
                else:
                    failed_count += 1
                    print("❌ Failed to parse")
    
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return False
    
    # Test essentials creation
    print(f"\n--- Essentials Creation ---")
    if problems:
        essentials = create_essentials_entry(problems)
        print(f"✅ Essentials created:")
        print(f"   Total problems: {essentials.get('count')}")
        print(f"   JSON size: {len(json.dumps(essentials, ensure_ascii=False))} bytes")
        
        # Show first few essentials entries
        print("   Sample essentials entries:")
        for j, problem in enumerate(essentials.get('problems', [])[:3]):
            print(f"     {j + 1}. ID: {problem.get('id')}, Title: {problem.get('title')}, Difficulty: {problem.get('difficulty')}")
    
    # Summary
    print(f"\n--- Summary ---")
    print(f"Total rows processed: {sample_size}")
    print(f"Successfully parsed: {parsed_count}")
    print(f"Failed to parse: {failed_count}")
    print(f"Success rate: {(parsed_count / sample_size * 100):.1f}%")
    
    return failed_count == 0


def test_data_validation():
    """Test data validation with edge cases."""
    print("\n--- Data Validation Tests ---")
    
    # Test case 1: Missing required fields
    test_row_1 = {
        'frontendQuestionId': '',
        'title': 'Test Problem',
        'difficulty': 'Easy'
    }
    result_1 = parse_csv_row(test_row_1)
    print(f"Test 1 (missing ID): {'✅ Skipped' if result_1 is None else '❌ Should have been skipped'}")
    
    # Test case 2: Empty topics
    test_row_2 = {
        'frontendQuestionId': '999',
        'title': 'Test Problem',
        'difficulty': 'Easy',
        'topics': '',
        'hints': '',
        'acceptance_rate': '',
        'likes': '',
        'dislikes': ''
    }
    result_2 = parse_csv_row(test_row_2)
    print(f"Test 2 (empty fields): {'✅ Handled' if result_2 and result_2.get('id') == 999 else '❌ Failed'}")
    
    # Test case 3: Parsed topics and hints
    test_row_3 = {
        'frontendQuestionId': '998',
        'title': 'Test Problem',
        'difficulty': 'Medium',
        'topics': '["Array", "Hash Table"]',
        'hints': '["Use hash map", "Consider edge cases"]',
        'acceptance_rate': '45.5%',
        'likes': '1000',
        'dislikes': '50'
    }
    result_3 = parse_csv_row(test_row_3)
    if result_3:
        topics = result_3.get('metadata', {}).get('topics', [])
        hints = result_3.get('metadata', {}).get('hints', [])
        acceptance = result_3.get('metadata', {}).get('acceptance_rate')
        print(f"Test 3 (parsed arrays): {'✅ Parsed' if topics and hints and acceptance == 45.5 else '❌ Failed'}")
        print(f"   Topics: {topics}")
        print(f"   Hints: {hints}")
        print(f"   Acceptance: {acceptance}")
    
    print("Data validation tests completed.")


def main():
    """Main test function."""
    if len(sys.argv) < 2:
        print("Usage: python test_upload.py <csv_file> [sample_size]")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    sample_size = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    print("Cloudflare KV Upload Test Script")
    print("=" * 60)
    print(f"CSV File: {csv_file}")
    print(f"Sample Size: {sample_size}")
    
    # Test CSV parsing
    success = test_csv_parsing(csv_file, sample_size)
    
    # Test data validation
    test_data_validation()
    
    if success:
        print("\n✅ All tests passed! Ready for upload.")
    else:
        print("\n❌ Some tests failed. Check the data and try again.")
        sys.exit(1)


if __name__ == "__main__":
    main()