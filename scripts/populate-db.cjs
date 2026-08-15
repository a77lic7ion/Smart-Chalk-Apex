const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'smart_chalk_user',
  host: 'localhost',
  database: 'smart_chalk',
  password: 'smart_chalk_password',
  port: 5432,
});

const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'DBexample.json'), 'utf-8'));

async function populateDatabase() {
  for (const item of jsonData.trainingData) {
    const { question, answer, curriculum, standard, grade, subject, sourceId, createdAt } = item;
    const query = `
      INSERT INTO content (user_id, question, answer, curriculum, standard, grade, subject, sourceId, createdAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    const values = [1, question, answer, curriculum, standard, grade, subject, sourceId, createdAt];
    await pool.query(query, values);
  }
  console.log('Database populated successfully!');
  pool.end();
}

populateDatabase().catch(err => {
  console.error('Error populating database:', err);
  pool.end();
});