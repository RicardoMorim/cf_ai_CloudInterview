import csv
import json
import os
import ast

def parse_csv_row(row):
    try:
        # Extract basic fields
        frontend_question_id = row.get('frontendQuestionId', '').strip()
        if not frontend_question_id:
            return None
        
        # Handle IDs like "1.0"
        try:
            q_id = int(float(frontend_question_id))
        except ValueError:
            # print(f"Skipping row with invalid ID: {frontend_question_id}")
            return None
        
        # Parse topics
        topics_str = row.get('topics', '[]')
        topics = []
        try:
            if topics_str:
                topics = ast.literal_eval(topics_str)
        except:
            pass
            
        # Parse hints
        hints_str = row.get('hints', '[]')
        hints = []
        try:
            if hints_str:
                hints = ast.literal_eval(hints_str)
        except:
            pass

        # Create the problem dictionary (Full Data)
        problem = {
            "id": q_id,
            "difficulty": row.get('difficulty', '').strip(),
            "title": row.get('title', '').strip(),
            "titleSlug": row.get('titleSlug', '').strip(),
            "url": row.get('url', '').strip(),
            "description": row.get('description', '').strip(),
            "metadata": {
                "category": row.get('category', '').strip(),
                "topics": topics,
                "hints": hints,
                "likes": int(float(row.get('likes', '0') or 0)),
                "dislikes": int(float(row.get('dislikes', '0') or 0)),
                "acceptance_rate": row.get('acceptance_rate', '')
            }
        }
        
        # Add solution codes
        for lang in ['python', 'java', 'cpp']:
            code_key = f'solution_code_{lang}'
            if row.get(code_key):
                problem[code_key] = row[code_key]

        return problem
    except Exception as e:
        # print(f"Error parsing row: {e}")
        return None

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, 'leetcode_problems.csv')
    output_path = os.path.join(script_dir, 'kv_bulk_data.json')
    
    print(f"Reading from {csv_path}...")
    
    bulk_data = []
    essentials_list = []
    
    with open(csv_path, mode='r', encoding='utf-8') as csv_file:
        reader = csv.DictReader(csv_file)
        count = 0
        
        for row in reader:
            problem = parse_csv_row(row)
            if problem:
                # 1. Add individual problem entry
                bulk_data.append({
                    "key": f"problem:{problem['id']}",
                    "value": json.dumps(problem, separators=(',', ':'))
                })
                
                # 2. Add to essentials list (compact)
                essentials_list.append({
                    "id": str(problem['id']), # String ID to match some usages
                    "title": problem['title'],
                    "difficulty": problem['difficulty'],
                    "topics": problem['metadata']['topics']
                })
                
                count += 1
                if count % 1000 == 0:
                    print(f"Processed {count} rows...")

    # 3. Add essentials entry
    # Wrap in "problems" object as expected by the TS code
    essentials_data = {"problems": essentials_list}
    bulk_data.append({
        "key": "essentials",
        "value": json.dumps(essentials_data, separators=(',', ':'))
    })
    
    print(f"Finished. Total keys to upload: {len(bulk_data)}")
    print(f"Writing to {output_path}...")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(bulk_data, f, separators=(',', ':'))
        
    print("Done.")

if __name__ == "__main__":
    main()
