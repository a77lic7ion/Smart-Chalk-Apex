// server/src/services/dataGenerationService.ts

import { Pool } from 'pg';
import crypto from 'crypto';

// Use a dynamic import for the ES Module
const getOpenAIService = async () => {
  const { generateContentWithOpenAI } = await import('../../../services/openai');
  return generateContentWithOpenAI;
};

// This function assumes the pool is created and managed elsewhere (e.g., in server/src/db.ts)
// and passed to the functions that need it.

/**
 * Calls an AI service to discover the relevant topics for a given grade, subject, and curriculum.
 */
export async function discoverTopics(grade: string, subject: string, curriculum: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in the environment variables.");
  }

  const systemInstruction = `You are an expert in global educational curricula. Your task is to provide a list of specific, examinable topics for a given grade, subject, and curriculum.`;
  const userPrompt = `Please provide a list of the key topics for the subject "${subject}" at the "${grade}" level for the "${curriculum}" curriculum for the current academic year. The response should be a JSON object with a single key "topics" which is an array of strings. For example: {"topics": ["Algebraic Expressions", "Geometry of Straight Lines", "Probability"]}.`;

  try {
    const generateContentWithOpenAI = await getOpenAIService();
    const rawJson = await generateContentWithOpenAI(systemInstruction, userPrompt, apiKey, 0.3);
    const parsed = JSON.parse(rawJson);
    if (!parsed.topics || !Array.isArray(parsed.topics)) {
      throw new Error("AI response did not contain a 'topics' array.");
    }
    return parsed.topics.filter((t: any) => typeof t === 'string');
  } catch (error) {
    console.error(`Error discovering topics for ${curriculum} - ${subject} - ${grade}:`, error);
    return [];
  }
}


/**
 * Saves a batch of curated questions to the 'training_data' table.
 */
export async function saveQuestionsToDatabase(pool: Pool, questions: any[]): Promise<void> {
  if (questions.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const query = `
      INSERT INTO training_data (source_id, user_id, curriculum, standard, grade, subject, content, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    for (const q of questions) {
      const sourceId = crypto.randomUUID(); // Generate a unique ID for each question entry
      const userId = 1; // Default to admin user
      const standard = `${q.grade} - ${q.subject} - ${q.topic}`;
      const content = { question: q.question, answer: q.answer };
      const createdAt = new Date();

      await client.query(query, [sourceId, userId, q.curriculum, standard, q.grade, q.subject, content, createdAt]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving questions to database. Transaction rolled back.', error);
    throw new Error('Failed to save questions to the database.');
  } finally {
    client.release();
  }
}

/**
 * Fetches existing questions from the database for a specific combination.
 */
export async function getExistingQuestions(pool: Pool, grade: string, subject: string, curriculum: string, topic: string): Promise<string[]> {
  const query = `
    SELECT content ->> 'question' as question
    FROM training_data
    WHERE
      grade = $1 AND
      subject = $2 AND
      curriculum = $3 AND
      standard LIKE $4;
  `;
  const standardSearchPattern = `%${topic}%`;

  try {
    const result = await pool.query(query, [grade, subject, curriculum, standardSearchPattern]);
    return result.rows.map(row => row.question);
  } catch (error) {
    console.error(`Error fetching existing questions for topic "${topic}":`, error);
    return [];
  }
}

/**
 * Generates a batch of new questions using the AI.
 */
export async function generateQuestionBatch(
  grade: string,
  subject: string,
  curriculum: string,
  topic: string,
  batchSize: number,
  existingQuestions: string[]
): Promise<any[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");

  const systemInstruction = `You are an expert curriculum developer. Your task is to generate high-quality, unique questions and answers for a specific topic, based on a list of existing questions to avoid duplication.`;
  const userPrompt = `
    For the subject "${subject}", grade "${grade}", curriculum "${curriculum}", and topic "${topic}", please generate ${batchSize} new and unique question-and-answer pairs.

    To avoid duplicates, please DO NOT generate any of the following questions that already exist:
    --- EXISTING QUESTIONS START ---
    ${existingQuestions.slice(-200).join('\n')}
    --- EXISTING QUESTIONS END ---

    Your response MUST be a single valid JSON object with a single key "generated_questions", which holds an array of the structured question objects.
    Each object in the array must strictly follow this structure:
    { "question": "string", "answer": "string" }.
  `;

  try {
    const generateContentWithOpenAI = await getOpenAIService();
    const rawJson = await generateContentWithOpenAI(systemInstruction, userPrompt, apiKey, 0.7);
    const parsed = JSON.parse(rawJson);
    if (!parsed.generated_questions || !Array.isArray(parsed.generated_questions)) {
      throw new Error("AI response did not contain a 'generated_questions' array.");
    }
    return parsed.generated_questions;
  } catch (error) {
    console.error(`! Error generating question batch for topic "${topic}":`, error);
    return [];
  }
}
