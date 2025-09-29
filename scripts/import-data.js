const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://smart_chalk_user:smart_chalk_password@localhost:5432/smart_chalk'
});

async function importData() {
  try {
    console.log('Starting data import...');
    
    // Read the JSON file
    const jsonPath = '/app/DBexample.json';
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    console.log(`Found ${jsonData.trainingData.length} training data records to import`);
    
    // Create a default user if it doesn't exist
    const userResult = await pool.query(`
      INSERT INTO users (email, name) 
      VALUES ('admin@smartchalk.com', 'Admin User')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    
    const userId = userResult.rows[0].id;
    console.log(`Using user ID: ${userId}`);
    
    // Import training data
    let importedCount = 0;
    for (const item of jsonData.trainingData) {
      try {
        // Create content object that matches the expected structure
        const content = {
          question: item.question,
          answer: item.answer
        };
        
        await pool.query(`
          INSERT INTO training_data (
            source_id, 
            user_id, 
            curriculum, 
            standard, 
            grade, 
            subject, 
            content, 
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING
        `, [
          item.sourceId,
          userId,
          item.curriculum,
          item.standard,
          item.grade,
          item.subject,
          JSON.stringify(content),
          new Date(item.createdAt)
        ]);
        
        importedCount++;
        
        if (importedCount % 100 === 0) {
          console.log(`Imported ${importedCount} records...`);
        }
      } catch (error) {
        console.error(`Error importing record ${item.id}:`, error.message);
      }
    }
    
    console.log(`Successfully imported ${importedCount} training data records`);
    
    // Verify the import
    const countResult = await pool.query('SELECT COUNT(*) FROM training_data WHERE user_id = $1', [userId]);
    console.log(`Total training data records in database for user ${userId}: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await pool.end();
  }
}

// Run the import
if (require.main === module) {
  importData();
}

module.exports = { importData };