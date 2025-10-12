// scripts/generate_finetuning_data.ts

// scripts/generate_finetuning_data.ts

import { program } from 'commander';
import dotenv from 'dotenv';
import { generateContentWithOpenAI } from '../services/openai';
import { Pool } from 'pg';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE || 'smart_chalk',
  user: process.env.DB_USER || 'smart_chalk_user',
  password: process.env.DB_PASSWORD || 'smart_chalk_password',
});

interface CLIOptions {
  grade: string;
  subject: string;
  curriculums: string; // Comma-separated list
}

/**
 * Calls an AI service to discover the relevant topics for a given grade, subject, and curriculum.
 * @param grade The grade level (e.g., "Grade 3").
 * @param subject The subject (e.g., "English").
 * @param curriculum The curriculum (e.g., "CAPS").
 * @returns A promise that resolves to an array of topic strings.
 */
async function discoverTopics(grade: string, subject: string, curriculum: string): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in the environment variables.");
  }

  const systemInstruction = `You are an expert in global educational curricula. Your task is to provide a list of specific, examinable topics for a given grade, subject, and curriculum.`;
  const userPrompt = `Please provide a list of the key topics for the subject "${subject}" at the "${grade}" level for the "${curriculum}" curriculum for the current academic year. The response should be a JSON object with a single key "topics" which is an array of strings. For example: {"topics": ["Algebraic Expressions", "Geometry of Straight Lines", "Probability"]}.`;

  try {
    const rawJson = await generateContentWithOpenAI(systemInstruction, userPrompt, apiKey, 0.3);
    const parsed = JSON.parse(rawJson);
    if (!parsed.topics || !Array.isArray(parsed.topics)) {
      throw new Error("AI response did not contain a 'topics' array.");
    }
    return parsed.topics.filter((t: any) => typeof t === 'string');
  } catch (error) {
    console.error(`Error discovering topics for ${curriculum} - ${subject} - ${grade}:`, error);
    // Return an empty array to allow the script to continue with other curriculums.
    return [];
  }
}


/**
 * Fetches existing questions from the database for a specific combination.
 * @param grade The grade level.
 * @param subject The subject.
 * @param curriculum The curriculum.
 * @param topic The topic.
 * @returns A promise that resolves to an array of existing question strings.
 */
async function getExistingQuestions(grade: string, subject: string, curriculum: string, topic: string): Promise<string[]> {
  const query = `
    SELECT content ->> 'question' as question
    FROM training_data
    WHERE
      grade = $1 AND
      subject = $2 AND
      curriculum = $3 AND
      standard LIKE $4;
  `;
  // We use a LIKE query on `standard` as a proxy for topic, assuming a convention like "Grade - Subject - Topic".
  const standardSearchPattern = `%${topic}%`;

  try {
    const result = await pool.query(query, [grade, subject, curriculum, standardSearchPattern]);
    return result.rows.map(row => row.question);
  } catch (error) {
    console.error(`Error fetching existing questions for topic "${topic}":`, error);
    return []; // Return empty array on error to not block the process
  }
}


/**
 * Generates a batch of new questions using the AI, based on existing questions for context.
 * @returns A promise that resolves to an array of new question objects.
 */
async function generateQuestionBatch(
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
    const rawJson = await generateContentWithOpenAI(systemInstruction, userPrompt, apiKey, 0.7);
    const parsed = JSON.parse(rawJson);
    if (!parsed.generated_questions || !Array.isArray(parsed.generated_questions)) {
      throw new Error("AI response did not contain a 'generated_questions' array.");
    }
    return parsed.generated_questions;
  } catch (error) {
    console.error(`    ! Error generating question batch for topic "${topic}":`, error);
    return []; // Return empty on error to continue the main loop
  }
}


async function main(options: CLIOptions) {
  console.log('Starting data generation with the following options:');
  console.log(options);

  const curriculumList = options.curriculums.split(',').map(c => c.trim());
  const allGeneratedQuestions: any[] = []; // To store all new questions

  // 1. Implement AI Topic Discovery
  console.log('\nStep 1: Discovering topics for each curriculum...');
  const topicsByCurriculum: Record<string, string[]> = {};
  for (const curriculum of curriculumList) {
    console.log(`  - Discovering topics for ${curriculum}...`);
    const topics = await discoverTopics(options.grade, options.subject, curriculum);
    topicsByCurriculum[curriculum] = topics;
    console.log(`    > Found ${topics.length} topics for ${curriculum}: ${topics.join(', ')}`);
  }

  // 2. Main Generation Loop
  console.log('\nStep 2: Starting main generation loop...');
  for (const curriculum of curriculumList) {
    console.log(`\nProcessing curriculum: ${curriculum}`);
    const topics = topicsByCurriculum[curriculum];
    for (const topic of topics) {
      console.log(`  - Processing topic: ${topic}`);

      // 3. History Check & Needs Assessment
      console.log(`    > Checking database for existing questions...`);
      const existingQuestions = await getExistingQuestions(options.grade, options.subject, curriculum, topic);
      console.log(`    > Found ${existingQuestions.length} existing questions for this topic.`);

      const questionsNeeded = 300 - existingQuestions.length;
      if (questionsNeeded <= 0) {
        console.log(`    > Topic has 300 or more questions. Skipping generation.`);
        continue;
      }
      console.log(`    > Need to generate ${questionsNeeded} new questions.`);

      // 4. Incremental AI Content Generation
      while (questionsNeeded > 0) {
        const batchSize = Math.min(25, questionsNeeded);
        console.log(`    > Generating a batch of ${batchSize} questions...`);

        const newQuestions = await generateQuestionBatch(
          options.grade,
          options.subject,
          curriculum,
          topic,
          batchSize,
          existingQuestions
        );

        if (newQuestions.length > 0) {
          // Add full context for the export step later
          const questionsWithContext = newQuestions.map(q => ({
            ...q,
            grade: options.grade,
            subject: options.subject,
            curriculum: curriculum,
            topic: topic,
          }));
          allGeneratedQuestions.push(...questionsWithContext);

          // Save the new questions to the database to ensure they are recorded for future runs
          await saveQuestionsToDatabase(questionsWithContext);

          // Add just the question text to existingQuestions to prevent duplicates in the next batch
          existingQuestions.push(...newQuestions.map(q => q.question));
        }

        let questionsGeneratedInBatch = newQuestions.length;
        questionsNeeded -= questionsGeneratedInBatch;

        // If the AI returned fewer questions than we asked for, or none, break to avoid infinite loops
        if (questionsGeneratedInBatch < batchSize) {
            if (questionsGeneratedInBatch === 0) {
              console.log(`    ! AI returned no questions. Moving to next topic to avoid errors.`);
            } else {
              console.log(`    ! AI returned fewer questions than requested. Moving to next topic.`);
            }
            break;
        }
      }
    }
  }

  // 5. Aggregate and Export Data
  console.log('\nStep 5: Aggregating and exporting data...');
  if (allGeneratedQuestions.length > 0) {
    const outputFilename = 'generated_data.jsonl';
    await exportToJsonl(allGeneratedQuestions, outputFilename);
    console.log(`  > Successfully exported ${allGeneratedQuestions.length} new questions to ${outputFilename}`);
  } else {
    console.log('  > No new questions were generated. Nothing to export.');
  }

  console.log('\nData generation script finished.');
  await pool.end(); // Close the database connection
}

/**
 * Saves a batch of generated questions to the 'training_data' table in the database.
 */
async function saveQuestionsToDatabase(questions: any[]): Promise<void> {
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
    console.log(`    > Successfully saved ${questions.length} new questions to the database.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('    ! Error saving questions to database. Transaction rolled back.', error);
  } finally {
    client.release();
  }
}


/**
 * Exports an array of question objects to a JSONL file.
 * Each object is stringified and written as a new line.
 * This function will overwrite the file if it already exists.
 * @param questions The array of question objects to export.
 * @param filename The name of the file to write to.
 */
async function exportToJsonl(questions: any[], filename: string): Promise<void> {
  const fs = await import('fs/promises');
  const content = questions.map(q => JSON.stringify(q)).join('\n') + '\n';
  // Use writeFile to overwrite the file on each run, ensuring a clean export
  await fs.writeFile(filename, content);
}

program
  .version('1.0.0')
  .description('A script to generate fine-tuning data for an LLM.')
  .requiredOption('-g, --grade <grade>', 'The grade level for the content (e.g., "Grade 3").')
  .requiredOption('-s, --subject <subject>', 'The subject for the content (e.g., "English").')
  .requiredOption('-c, --curriculums <curriculums>', 'A comma-separated list of curriculums (e.g., "CAPS,IB").')
  .action((options) => {
    main(options).catch(err => {
      console.error('An error occurred:', err);
      process.exit(1);
    });
  });

program.parse(process.argv);
