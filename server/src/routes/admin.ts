import { Router, Response } from 'express';
import pool from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { discoverTopics, getExistingQuestions, generateQuestionBatch, saveQuestionsToDatabase } from '../services/dataGenerationService';
import crypto from 'crypto';

const router = Router();

// Endpoint to generate questions for the admin curation tool
router.post('/generate-questions', [authMiddleware, adminMiddleware], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { grade, subject, curriculums } = req.body;

    if (!grade || !subject || !curriculums) {
      return res.status(400).json({ message: 'Missing required parameters: grade, subject, curriculums.' });
    }

    const curriculumList = curriculums.split(',').map((c: string) => c.trim());
    const allGeneratedQuestions: any[] = [];

    for (const curriculum of curriculumList) {
      const topics = await discoverTopics(grade, subject, curriculum);

      for (const topic of topics) {
        const existingQuestions = await getExistingQuestions(pool, grade, subject, curriculum, topic);
        let questionsNeeded = 300 - existingQuestions.length;

        if (questionsNeeded <= 0) {
          continue; // Skip if quota is met
        }

        while (questionsNeeded > 0) {
          const batchSize = Math.min(25, questionsNeeded);
          const newQuestions = await generateQuestionBatch(
            grade,
            subject,
            curriculum,
            topic,
            batchSize,
            existingQuestions
          );

          if (newQuestions.length > 0) {
            const questionsWithContext = newQuestions.map(q => ({
              ...q,
              id: crypto.randomUUID(), // Assign a temporary ID for the frontend
              grade: grade,
              subject: subject,
              curriculum: curriculum,
              topic: topic,
            }));
            allGeneratedQuestions.push(...questionsWithContext);
            existingQuestions.push(...newQuestions.map(q => q.question));
          }

          questionsNeeded -= newQuestions.length;
          if (newQuestions.length < batchSize) {
            break; // AI returned fewer than requested, move on
          }
        }
      }
    }

    res.json(allGeneratedQuestions);

  } catch (error) {
    console.error('Error in /generate-questions endpoint:', error);
    res.status(500).json({ message: 'An internal server error occurred during question generation.' });
  }
});


// Get all saved content from all users
router.get('/content', [authMiddleware, adminMiddleware], async (req: AuthenticatedRequest, res: Response) => {
  try {
    // The adminMiddleware has already verified that req.user exists and is an admin.
    const result = await pool.query('SELECT sc.*, u.email as user_email FROM saved_content sc JOIN users u ON sc.user_id = u.id ORDER BY sc.created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/db-test', [authMiddleware, adminMiddleware], async (req: AuthenticatedRequest, res: Response) => {
  try {
    await pool.query('SELECT NOW()');
    res.status(200).json({ message: 'Database connection successful' });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// Endpoint to save curated questions to the database
router.post('/save-questions', [authMiddleware, adminMiddleware], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Request body must be an array of questions.' });
    }

    await saveQuestionsToDatabase(pool, questions);

    res.status(201).json({ message: `Successfully saved ${questions.length} questions.` });

  } catch (error) {
    console.error('Error in /save-questions endpoint:', error);
    res.status(500).json({ message: 'An internal server error occurred while saving questions.' });
  }
});


export default router;
