#!/usr/bin/env python3
"""
Test script to verify the AI mental health analysis integration
"""
import json
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from analyze_mental_health import analyze_mental_health

def test_analysis():
    """Test the mental health analysis with sample data including gender"""
    
    # Sample answers
    test_answers = {
        "mood": "Anxious",
        "stressLevel": 8,
        "moodLevel": 3,
        "sleepHours": 5,
        "anxietyFrequency": "Yes",
        "overwhelmedFrequency": "Yes"
    }
    
    # Test data with gender
    test_data = {
        "answers": test_answers,
        "dailySummary": "I've been feeling really overwhelmed lately with work and personal issues. Can't seem to focus on anything.",
        "userGender": "Female"
    }
    
    print("Testing mental health analysis with sample data including gender:")
    print(f"Sample data: {json.dumps(test_data, indent=2)}")
    print("\n" + "="*50 + "\n")
    
    # Convert to JSON string
    test_data_json = json.dumps(test_data)
    
    # Run analysis
    result = analyze_mental_health(test_data_json)
    
    # Parse and display result
    try:
        analysis = json.loads(result)
        print("AI Analysis Result:")
        print(f"Summary: {analysis.get('summary', 'N/A')}")
        print(f"Risk Level: {analysis.get('riskLevel', 'N/A')}")
        print(f"Recommendations: {analysis.get('recommendations', 'N/A')}")
        print(f"Timestamp: {analysis.get('timestamp', 'N/A')}")
        
        if 'error' in analysis:
            print(f"Error: {analysis['error']}")
            
    except json.JSONDecodeError as e:
        print(f"Failed to parse result as JSON: {e}")
        print(f"Raw result: {result}")

if __name__ == "__main__":
    test_analysis()
