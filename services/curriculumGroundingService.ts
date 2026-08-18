import { db } from '../db';
import type { Curriculum, CurriculumGroundingContext, CurriculumSourceRecord, TestGenerationParams } from '../types';
import { parseFile } from '../utils/fileParser';
import { generateUUID } from '../utils/uuidCompat';

const DBE_CAPS_DIRECTORY_URL = 'https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx';
const IEB_GUIDELINES_URL = 'https://www.ieb.co.za/assessment/high-schools/national-senior-certificate/nsc-subject-assessment-guidelines';
const ONLINE_SOURCE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

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

const isVerifiedDbeSource = (source: CurriculumSourceRecord) => {
  try {
    return new URL(source.sourceUrl).hostname === 'www.education.gov.za';
  } catch {
    return false;
  }
};

const sourceIsFresh = (source: CurriculumSourceRecord) => Date.now() - source.lastVerifiedAt < ONLINE_SOURCE_MAX_AGE_MS;

const getSourceFilename = (sourceName: string) => sourceName
  .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'dbe-caps-source';

const retrieveOfficialDbeSource = async (
  params: TestGenerationParams,
  userId?: string,
): Promise<CurriculumSourceRecord> => {
  const endpoint = `/api/curriculum-source?grade=${encodeURIComponent(params.grade)}&subject=${encodeURIComponent(params.subject)}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    let reason = '';
    try {
      const body = await response.json() as { error?: string };
      reason = body.error || '';
    } catch {
      // Keep the user-facing error concise if the upstream source returned a non-JSON failure.
    }
    throw new Error(reason || `SmartChalk could not retrieve the official DBE CAPS source online for ${params.grade} ${params.subject}. Please try again later.`);
  }

  const sourceUrl = response.headers.get('X-Curriculum-Source-Url') || DBE_CAPS_DIRECTORY_URL;
  const sourceName = response.headers.get('X-Curriculum-Source-Name') || `DBE CAPS — ${params.subject}`;
  const sourceFilename = response.headers.get('X-Curriculum-Source-Filename') || `${getSourceFilename(sourceName)}.pdf`;
  const blob = await response.blob();
  const file = new File([blob], sourceFilename, { type: blob.type || 'application/pdf' });
  const sourceText = (await parseFile(file)).replace(/\s+/g, ' ').trim().slice(0, 500000);

  if (sourceText.length < 500) {
    throw new Error(`SmartChalk retrieved the official DBE CAPS source for ${params.grade} ${params.subject}, but its text could not be read reliably. Please try again later.`);
  }

  const record: CurriculumSourceRecord = {
    id: generateUUID(),
    userId,
    curriculum: 'CAPS',
    publisher: 'DBE',
    name: sourceName,
    sourceUrl,
    sourceText,
    grade: params.grade,
    subject: params.subject,
    importedAt: Date.now(),
    lastVerifiedAt: Date.now(),
    syncStatus: 'dirty',
  };

  await db.curriculumSources.put(record);
  return record;
};

const getDbeSource = async (params: TestGenerationParams, userId?: string) => {
  const sources = userId
    ? await db.curriculumSources.where('userId').equals(userId).toArray()
    : await db.curriculumSources.toArray();

  const existingOnlineSource = sources.find(source =>
    source.publisher === 'DBE'
    && source.curriculum === 'CAPS'
    && sourceMatches(source, params)
    && isVerifiedDbeSource(source)
    && sourceIsFresh(source),
  );

  return existingOnlineSource || retrieveOfficialDbeSource(params, userId);
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

  const dbeSource = await getDbeSource(params, userId);
  const sourceExcerpt = buildRelevantExcerpt(dbeSource.sourceText, params.topic);
  if (sourceExcerpt.length < 120) {
    throw new Error(
      `The official DBE CAPS source for ${params.grade} ${params.subject} does not clearly cover “${params.topic}”. ` +
      'Please refine the topic and try again; SmartChalk will not guess at curriculum scope.',
    );
  }

  return {
    sourceId: dbeSource.id,
    publisher: 'DBE',
    sourceName: dbeSource.name,
    sourceUrl: dbeSource.sourceUrl,
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
