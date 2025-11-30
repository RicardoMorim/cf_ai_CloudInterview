import csv
import json
import ast
import os

def convert_csv_to_json(csv_file_path, json_file_path):
    print(f"Reading from {csv_file_path}...")
    data = []
    
    if not os.path.exists(csv_file_path):
        print(f"Error: File {csv_file_path} not found.")
        return

    try:
        with open(csv_file_path, mode='r', encoding='utf-8') as csv_file:
            reader = csv.DictReader(csv_file)
            
            count = 0
            for row in reader:
                try:
                    # Extract required fields
                    difficulty = row.get('difficulty')
                    # Use frontendQuestionId as questionId as it's the one usually displayed
                    question_id = row.get('frontendQuestionId')
                    title = row.get('title')
                    
                    # Parse topics (which looks like a string representation of a list)
                    topics_raw = row.get('topics', '[]')
                    tags = []
                    try:
                        if topics_raw:
                            tags = ast.literal_eval(topics_raw)
                    except (ValueError, SyntaxError):
                        # Handle cases where it might not be a valid list string
                        tags = []
                    
                    # Create the object with essentials data
                    # User requested: difficulty, questionId, title, tags, topics
                    # Mapping 'topics' column to 'tags' and 'topics' keys as requested.
                    # Also including 'category' if available, as it might be useful, 
                    # but strictly adhering to the requested keys for the main structure.
                    
                    item = {
                        "difficulty": difficulty,
                        "questionId": question_id,
                        "title": title,
                        "topics": tags  
                    }
                    
                    data.append(item)
                    count += 1
                    if count % 1000 == 0:
                        print(f"Processed {count} rows...")
                        
                except Exception as e:
                    print(f"Error processing row {count}: {e}")
                    continue
                    
        print(f"Finished processing {count} rows.")
        print(f"Writing to {json_file_path}...")
        
        with open(json_file_path, 'w', encoding='utf-8') as json_file:
            # Wrap in "problems" key
            output_data = {"problems": data}
            json.dump(output_data, json_file, separators=(',', ':'))
            
        print("Done.")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Use absolute paths or relative to the script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, 'leetcode_problems.csv')
    json_path = os.path.join(script_dir, 'leetcode_essentials.json')
    
    convert_csv_to_json(csv_path, json_path)
