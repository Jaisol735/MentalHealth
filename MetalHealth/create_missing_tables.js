#!/usr/bin/env node
/**
 * Script to create missing database tables
 * Run this script to fix the "Table doesn't exist" errors
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function createMissingTables() {
  console.log('=== CREATING MISSING DATABASE TABLES ===');
  
  let connection;
  try {
    // Create database connection
    console.log('Step 1: Connecting to database...');
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Add your MySQL password here if needed
      database: 'mentalhealth'
    });
    console.log('Step 1: Database connected successfully');

    // Read and execute the mental health table creation script
    console.log('Step 2: Creating MentalHealthAssessments table...');
    const tableScript = fs.readFileSync(
      path.join(__dirname, 'scripts/create_mental_health_table.sql'), 
      'utf8'
    );
    
    await connection.execute(tableScript);
    console.log('Step 2: MentalHealthAssessments table created successfully');

    // Verify table exists
    console.log('Step 3: Verifying table creation...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'MentalHealthAssessments'"
    );
    
    if (tables.length > 0) {
      console.log('Step 3: Table verification successful - MentalHealthAssessments table exists');
    } else {
      console.log('Step 3: WARNING - Table verification failed');
    }

    console.log('=== DATABASE TABLE CREATION COMPLETED ===');

  } catch (error) {
    console.error('Error creating tables:', error);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('Please check your MySQL credentials in this script');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('Please make sure the "mentalhealth" database exists');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run the script
createMissingTables().catch(console.error);
