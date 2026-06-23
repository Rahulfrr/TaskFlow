from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["https://taskflow-1-g605.onrender.com"])

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-3.1-flash-lite')

@app.route('/prioritize', methods=['POST'])
def prioritize_tasks():
    try:
        data = request.json
        tasks = data.get('tasks', [])
        
        if not tasks:
            return jsonify({'error': 'No tasks provided'}), 400
        
        # Format tasks for Gemini
        task_text = "\n".join([f"{i+1}. {task['name']} (Deadline: {task['deadline']}, Effort: {task.get('effort', 'quick')})" 
                               for i, task in enumerate(tasks)])
        
        # Create prompt for Gemini
        prompt = f"""You are a productivity expert. Analyze these tasks and prioritize them based on:
1. Deadline urgency (tasks due sooner = higher priority)
2. Effort level: "quick" tasks take under 30 mins, "medium" tasks take 1-3 hours, "deep" tasks take 3+ hours
3. Balance: if a deep focus task is due soon, rank it higher even if a quick task exists
4. Task importance (infer from task name)

Tasks:
{task_text}

Return a JSON response with this exact format (no extra text):
{{
  "prioritized_tasks": [
    {{"rank": 1, "name": "task name", "deadline": "deadline", "reasoning": "why this is priority 1"}},
    {{"rank": 2, "name": "task name", "deadline": "deadline", "reasoning": "why this is priority 2"}}
  ]
}}"""
        
        # Call Gemini
        response = model.generate_content(prompt)
        
        # Parse response
        import json
        import re
        
        response_text = response.text
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
        else:
            result = {"error": "Could not parse Gemini response"}
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Backend is running'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)