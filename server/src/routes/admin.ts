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
