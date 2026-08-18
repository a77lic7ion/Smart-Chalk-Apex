import { db } from '../db';
import type { Curriculum, CurriculumGroundingContext, CurriculumSourceRecord, TestGenerationParams } from '../types';

const DBE_CAPS_DIRECTORY_URL = 'https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx';
const IEB_GUIDELINES_URL = 'https://www.ieb.co.za/assessment/high-schools/national-senior-certificate/nsc-subject-assessment-guidelines';

const normalise = (value: string) => value
  .toLowerCase()
  .replace(/\([^)]*\)/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const sourceMatches = (source: CurriculumSourceRecord, params: TestGenerationParams) => {
  const sourceGrade = normalise(source.grade);
  const requestedGrade = normalise(params.grade);
  const sourceSubject = normalise(source.subject);
  const requestedSubject = normalise(params.subject);

  return (sourceGrade === requestedGrade || sourceGrade === 'all grades')
    && (sourceSubject === requestedSubject || sourceSubject === 'all subjects');
};

const topicTerms = (topic: string) => normalise(topic)
  .split(' ')
  .filter(term => term.length >= 4)
  .slice(0, 8);

const buildRelevantExcerpt = (text: string, topic: string): string => {
  const compactText = text.replace(/\s+/g, ' ').trim();
  if (!compactText) return '';

  const terms = topicTerms(topic);
  const lower = compactText.toLowerCase();
  const matchIndex = terms
    .map(term => lower.indexOf(term))
    .find(index => index >= 0);

  const centre = matchIndex ?? 0;
  const start = Math.max(0, centre - 1100);
  const end = Math.min(compactText.length, centre + 3500);
  return compactText.slice(start, end);
};

export const getOfficialCurriculumDirectories = (curriculum: Curriculum) => ({
  dbeCaps: {
    label: 'Department of Basic Education — CAPS curriculum documents',
    url: DBE_CAPS_DIRECTORY_URL,
  },
  ...(curriculum === 'IEB' ? {
    iebGuidelines: {
      label: 'Independent Examinations Board — NSC Subject Assessment Guidelines',
      url: IEB_GUIDELINES_URL,
    },
  } : {}),
});

export const resolveCurriculumGrounding = async (
  params: TestGenerationParams,
  userId?: string,
): Promise<CurriculumGroundingContext | undefined> => {
  if (params.curriculum !== 'CAPS' && params.curriculum !== 'IEB') return undefined;

  const sources = userId
    ? await db.curriculumSources.where('userId').equals(userId).toArray()
    : await db.curriculumSources.toArray();

  const matchingSources = sources.filter(source => sourceMatches(source, params));
  const dbeSource = matchingSources.find(source => source.publisher === 'DBE' && source.curriculum === 'CAPS');

  if (!dbeSource) {
    const directory = getOfficialCurriculumDirectories(params.curriculum).dbeCaps;
    throw new Error(
      `Source-grounded ${params.curriculum} generation requires the official DBE CAPS document for ${params.grade} ${params.subject}. ` +
      `Open ${directory.url}, download the matching document, then import it in the Curriculum Source section before generating.`,
    );
  }

  const sourceExcerpt = buildRelevantExcerpt(dbeSource.sourceText, params.topic);
  if (sourceExcerpt.length < 120) {
    throw new Error(
      `The imported DBE CAPS document for ${params.grade} ${params.subject} does not contain enough readable text to ground "${params.topic}". ` +
      'Please import the official text-based PDF or DOCX version of the correct CAPS document.',
    );
  }

  return {
    sourceId: dbeSource.id,
    publisher: 'DBE',
    sourceName: dbeSource.name,
    sourceUrl: dbeSource.sourceUrl || DBE_CAPS_DIRECTORY_URL,
    sourceExcerpt,
    importedAt: dbeSource.importedAt,
    alignmentStatus: 'source-grounded',
  };
};

export const selectAssessmentGuidance = async (
  params: TestGenerationParams,
  userId?: string,
): Promise<CurriculumGroundingContext | undefined> => {
  if (params.curriculum !== 'IEB') return undefined;
  const sources = userId
    ? await db.curriculumSources.where('userId').equals(userId).toArray()
    : await db.curriculumSources.toArray();
  const iebSource = sources.find(source => source.publisher === 'IEB' && sourceMatches(source, params));
  if (!iebSource) return undefined;

  const sourceExcerpt = buildRelevantExcerpt(iebSource.sourceText, params.topic);
  if (sourceExcerpt.length < 120) return undefined;

  return {
    sourceId: iebSource.id,
    publisher: 'IEB',
    sourceName: iebSource.name,
    sourceUrl: iebSource.sourceUrl || IEB_GUIDELINES_URL,
    sourceExcerpt,
    importedAt: iebSource.importedAt,
    alignmentStatus: 'source-grounded',
  };
};
