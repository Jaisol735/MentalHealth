const express = require('express');
const router = express.Router();
const DailySummary = require('../models/DailySummary');
const { authenticateToken } = require('../middleware/auth');

// Create or update a daily summary
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('=== STARTING DAILY SUMMARY CREATION ===');
    const { summary, isSynthetic = false } = req.body;
    const userId = req.user.user_id; // Get authenticated user's ID
    
    console.log('Step 1: Validating daily summary data...');
    console.log('User ID:', userId);
    console.log('Summary length:', summary ? summary.length : 0);
    console.log('Is synthetic:', isSynthetic);
    
    // Validate required fields
    if (!summary || !summary.trim()) {
      console.log('ERROR: Summary is required but not provided');
      return res.status(400).json({ 
        message: 'Summary is required' 
      });
    }
    console.log('Step 1: Validation completed successfully');

    // Get today's date in YYYY-MM-DD format
    console.log('Step 2: Getting today\'s date...');
    const today = new Date().toISOString().split('T')[0];
    console.log('Step 2: Today\'s date:', today);

    // Check if summary already exists for today
    console.log('Step 3: Checking for existing summary...');
    const existingSummary = await DailySummary.findOne({
      userId: userId,
      date: today
    });

    let dailySummary;

    if (existingSummary) {
      console.log('Step 3: Found existing summary, updating...');
      // Update existing summary
      dailySummary = await DailySummary.findOneAndUpdate(
        { _id: existingSummary._id, userId: userId },
        { 
          summary: summary.trim(),
          updatedAt: Date.now()
        },
        { new: true, runValidators: true }
      );
      console.log('Step 3: Summary updated successfully');
    } else {
      console.log('Step 3: No existing summary found, creating new one...');
      // Create new summary
      dailySummary = new DailySummary({
        userId: userId,
        date: today,
        summary: summary.trim(),
        isSynthetic: isSynthetic
      });

      await dailySummary.save();
      console.log('Step 3: New summary created successfully');
    }

    // Get user gender for AI analysis
    console.log('Step 4: Fetching user gender for AI analysis...');
    const User = require('../models/User');
    const user = await User.findById(userId);
    const userGender = user ? user.gender : null;
    console.log('Step 4: User gender fetched:', userGender);

    // Analyze the summary using AI
    console.log('Step 5: Starting AI analysis of daily summary...');
    const { spawn } = require('child_process');
    const path = require('path');
    
    const analyzeSummary = () => {
      return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../../AI_ENV/analyze_daily_summary.py');
        // Use virtual environment Python from 'Scripts' directory (Windows)
        const pythonExecutable = path.join(__dirname, '../../AI_ENV/venv/Scripts/python.exe');
        
        console.log('Step 5.1: Python executable path:', pythonExecutable);
        console.log('Step 5.1: Script path:', scriptPath);
        
        // Build context for AI analysis
        const context = {
          is_synthetic: isSynthetic,
          is_edit: !!existingSummary,
          time_of_day: new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          has_previous_analysis: existingSummary && existingSummary.aiAnalysis
        };
        
        console.log('Step 5.1: Analysis context:', context);
        
        const process = spawn(pythonExecutable, [
          scriptPath, 
          summary.trim(), 
          JSON.stringify(context),
          userGender || ''
        ], {
          cwd: path.dirname(scriptPath)
        });
        
        let output = '';
        let errorOutput = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.error('Python stderr:', data.toString());
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            try {
              const analysis = JSON.parse(output);
              resolve(analysis);
            } catch (e) {
              console.error('Error parsing analysis:', e);
              resolve({ 
                summary: 'Analysis completed but format unclear',
                mood_indicators: 'Unable to parse',
                patterns: 'Unable to parse',
                insights: 'Please try again later',
                suggestions: 'Continue journaling'
              });
            }
          } else {
            console.error('Python script error:', errorOutput);
            resolve({ 
              summary: 'Analysis failed',
              mood_indicators: 'Not available',
              patterns: 'Not available',
              insights: 'Please try again later',
              suggestions: 'Continue journaling'
            });
          }
        });
      });
    };
    
    const analysis = await analyzeSummary();
    console.log('Step 6: AI analysis completed');
    
    // Update the summary with AI analysis
    console.log('Step 7: Updating summary with AI analysis...');
    dailySummary.aiAnalysis = {
      summary: analysis.summary || 'Analysis completed',
      mood_indicators: analysis.mood_indicators || 'Not available',
      patterns: analysis.patterns || 'Not available',
      insights: analysis.insights || 'Please try again later',
      suggestions: analysis.suggestions || 'Continue journaling',
      timestamp: new Date()
    };
    
    await dailySummary.save();
    console.log('Step 7: Summary updated with AI analysis');

    console.log('Step 8: Sending response to client...');
    res.status(201).json({ 
      message: 'Daily summary saved and analyzed successfully', 
      summary: dailySummary,
      analysis: analysis
    });
    console.log('=== DAILY SUMMARY CREATION COMPLETED ===');
  } catch (error) {
    console.error('Error saving daily summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all daily summaries for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { limit = 30, offset = 0 } = req.query;

    const summaries = await DailySummary.find({ userId: userId })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    res.json({ 
      message: 'Daily summaries retrieved successfully', 
      summaries: summaries 
    });
  } catch (error) {
    console.error('Error retrieving daily summaries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get today's daily summary
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const today = new Date().toISOString().split('T')[0];

    const summary = await DailySummary.findOne({
      userId: userId,
      date: today
    });

    if (!summary) {
      return res.status(404).json({ 
        message: 'No summary found for today' 
      });
    }

    res.json({ 
      message: 'Today\'s summary retrieved successfully', 
      summary: summary 
    });
  } catch (error) {
    console.error('Error retrieving today\'s summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a specific daily summary
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { summary } = req.body;
    const userId = req.user.user_id;
    const summaryId = req.params.id;
    
    // Validate required fields
    if (!summary || !summary.trim()) {
      return res.status(400).json({ 
        message: 'Summary is required' 
      });
    }

    const dailySummary = await DailySummary.findOneAndUpdate(
      { _id: summaryId, userId: userId },
      { 
        summary: summary.trim(),
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!dailySummary) {
      return res.status(404).json({ message: 'Daily summary not found' });
    }

    // Get user gender for AI analysis
    const User = require('../models/User');
    const user = await User.findById(userId);
    const userGender = user ? user.gender : null;

    // Re-analyze the updated summary with context
    const { spawn } = require('child_process');
    const path = require('path');
    
    const analyzeSummary = () => {
      return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '../../AI_ENV/analyze_daily_summary.py');
        // Use virtual environment Python from 'Scripts' directory (Windows)
        const pythonExecutable = path.join(__dirname, '../../AI_ENV/venv/Scripts/python.exe');
        
        // Build context for AI analysis
        const context = {
          is_synthetic: dailySummary.isSynthetic,
          is_edit: true,
          time_of_day: new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          }),
          has_previous_analysis: !!dailySummary.aiAnalysis
        };
        
        const process = spawn(pythonExecutable, [
          scriptPath, 
          summary.trim(), 
          JSON.stringify(context),
          userGender || ''
        ], {
          cwd: path.dirname(scriptPath)
        });
        
        let output = '';
        let errorOutput = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
          console.error('Python stderr:', data.toString());
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            try {
              const analysis = JSON.parse(output);
              resolve(analysis);
            } catch (e) {
              console.error('Error parsing analysis:', e);
              resolve({ 
                summary: 'Analysis completed but format unclear',
                mood_indicators: 'Unable to parse',
                patterns: 'Unable to parse',
                insights: 'Please try again later',
                suggestions: 'Continue journaling'
              });
            }
          } else {
            console.error('Python script error:', errorOutput);
            resolve({ 
              summary: 'Analysis failed',
              mood_indicators: 'Not available',
              patterns: 'Not available',
              insights: 'Please try again later',
              suggestions: 'Continue journaling'
            });
          }
        });
      });
    };
    
    const analysis = await analyzeSummary();
    
    // Update the summary with new AI analysis
    dailySummary.aiAnalysis = {
      summary: analysis.summary || 'Analysis completed',
      mood_indicators: analysis.mood_indicators || 'Not available',
      patterns: analysis.patterns || 'Not available',
      insights: analysis.insights || 'Please try again later',
      suggestions: analysis.suggestions || 'Continue journaling',
      timestamp: new Date()
    };
    
    await dailySummary.save();

    res.json({ 
      message: 'Daily summary updated and re-analyzed successfully', 
      summary: dailySummary,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error updating daily summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a specific daily summary
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const summaryId = req.params.id;

    const dailySummary = await DailySummary.findOneAndDelete({
      _id: summaryId,
      userId: userId
    });

    if (!dailySummary) {
      return res.status(404).json({ message: 'Daily summary not found' });
    }

    res.json({ 
      message: 'Daily summary deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting daily summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
