import requests
import json
import time

BASE_URL = "http://localhost:8787"

def test_interview_flow():
    print("1. Creating Session...")
    try:
        response = requests.post(f"{BASE_URL}/api/sessions", json={
            "mode": "technical",
            "jobType": "Frontend Developer",
            "difficulty": "medium",
            "includeCoding": True
        })
        if response.status_code != 200:
            print(f"Failed to create session: {response.text}")
            return
        
        session_data = response.json()
        session_id = session_data["data"]["sessionId"]
        print(f"Session Created: {session_id}")
        
        print("\n2. Getting Next Question...")
        response = requests.get(f"{BASE_URL}/api/sessions/{session_id}/question/next")
        question_data = response.json()
        print(f"Question: {question_data['data']['question']['title']}")
        
        print("\n3. Submitting Answer...")
        answer_payload = {
            "answerText": "I would use a hash map to store the frequencies.",
            "codeSubmission": {
                "language": "javascript",
                "code": "function solve() { return {}; }"
            },
            "responseTime": 45
        }
        response = requests.post(f"{BASE_URL}/api/sessions/{session_id}/answer", json=answer_payload)
        result = response.json()
        print(f"AI Feedback: {result['data']['aiResponse']['content']}")
        
        print("\n4. Ending Session...")
        response = requests.post(f"{BASE_URL}/api/sessions/{session_id}/end")
        final_result = response.json()
        print(f"Final Summary: {final_result['data']['feedback']['summary']}")
        print(f"Overall Score: {final_result['data']['feedback']['overallScore']}")
        
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_interview_flow()
