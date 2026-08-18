type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => unknown;
  send: (body: Buffer) => unknown;
};

const DBE_ORIGIN = 'https://www.education.gov.za';
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

const PHASES: Record<string, { name: string; pageUrl: string }> = {
  foundation: {
    name: 'Foundation Phase',
    pageUrl: `${DBE_ORIGIN}/Curriculum/CurriculumAssessmentPolicyStatements(CAPS)/CAPSFoundation.aspx`,
  },
  intermediate: {
    name: 'Intermediate Phase',
    pageUrl: `${DBE_ORIGIN}/Curriculum/CurriculumAssessmentPolicyStatements(CAPS)/CAPSIntermediate.aspx`,
  },
  senior: {
    name: 'Senior Phase',
    pageUrl: `${DBE_ORIGIN}/Curriculum/CurriculumAssessmentPolicyStatements(CAPS)/CAPSSenior.aspx`,
  },
  fet: {
    name: 'Further Education and Training Phase',
    pageUrl: `${DBE_ORIGIN}/Curriculum/CurriculumAssessmentPolicyStatements(CAPS)/CAPSFET.aspx`,
  },
};

const subjectAliases: Record<string, string[]> = {
  'natural sciences': ['natural science'],
  'social sciences': ['social science'],
  'economic and management sciences': ['economics management and science'],
  'english first additional language': ['english first additional language', 'english fal'],
  'afrikaans first additional language': ['afrikaans first additional language', 'afrikaans fal'],
  'computer applications technology': ['computer applications technology', 'cat'],
  'information technology': ['information technology', 'it'],
  'engineering graphics and design': ['engineering graphics and design', 'egd'],
};

const toText = (value: string) => value
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalise = (value: string) => value
  .toLowerCase()
  .replace(/\([^)]*\)/g, '')
  .replace(/\b(fet|senior phase|intermediate phase|foundation phase)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const phaseForGrade = (grade: string) => {
  const gradeNumber = Number((grade.match(/\d+/) || [])[0]);
  if (gradeNumber >= 1 && gradeNumber <= 3) return PHASES.foundation;
  if (gradeNumber >= 4 && gradeNumber <= 6) return PHASES.intermediate;
  if (gradeNumber >= 7 && gradeNumber <= 9) return PHASES.senior;
  if (gradeNumber >= 10 && gradeNumber <= 12) return PHASES.fet;
  return undefined;
};

type DocumentLink = { title: string; url: string };

const extractDocumentLinks = (html: string): DocumentLink[] => {
  const links: DocumentLink[] = [];
  const anchorPattern = /<td\b[^>]*class="TitleCell"[^>]*>\s*<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html)) !== null) {
    const url = new URL(toText(match[1]), DBE_ORIGIN).href;
    const title = toText(match[2]);
    if (title && url.startsWith(DBE_ORIGIN)) links.push({ title, url });
  }

  return links;
};

const resolveSubjectDocument = (links: DocumentLink[], requestedSubject: string) => {
  const requested = normalise(requestedSubject);
  const candidates = [requested, ...(subjectAliases[requested] || [])];

  return links.find(link => candidates.includes(normalise(link.title)));
};

const isDbeUrl = (candidate: string) => {
  try {
    return new URL(candidate).hostname === 'www.education.gov.za';
  } catch {
    return false;
  }
};

const getQueryValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Only GET requests are supported.' });
  }

  const grade = getQueryValue(req.query.grade)?.trim() || '';
  const subject = getQueryValue(req.query.subject)?.trim() || '';
  const phase = phaseForGrade(grade);

  if (!phase || !subject) {
    return res.status(400).json({ error: 'A supported school grade and subject are required.' });
  }

  try {
    const directoryResponse = await fetch(phase.pageUrl, {
      headers: { 'User-Agent': 'SmartChalk official-source retriever/1.0' },
      signal: AbortSignal.timeout(12000),
    });

    if (!directoryResponse.ok) {
      throw new Error(`The DBE curriculum directory returned ${directoryResponse.status}.`);
    }

    const document = resolveSubjectDocument(extractDocumentLinks(await directoryResponse.text()), subject);
    if (!document) {
      return res.status(404).json({
        error: `The official DBE ${phase.name} CAPS page does not list an English source matching “${subject}”.`,
        directoryUrl: phase.pageUrl,
      });
    }

    const sourceResponse = await fetch(document.url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'SmartChalk official-source retriever/1.0' },
      signal: AbortSignal.timeout(20000),
    });

    const sourceUrl = sourceResponse.url;
    const contentLength = Number(sourceResponse.headers.get('content-length') || 0);
    const contentType = sourceResponse.headers.get('content-type') || '';

    if (!sourceResponse.ok || !isDbeUrl(sourceUrl)) {
      throw new Error('The official DBE source could not be retrieved safely.');
    }
    if (contentLength > MAX_DOCUMENT_BYTES) {
      throw new Error('The official DBE source is too large to retrieve safely.');
    }
    if (!contentType.toLowerCase().includes('pdf')) {
      throw new Error('The official DBE source did not return a PDF document.');
    }

    const content = Buffer.from(await sourceResponse.arrayBuffer());
    if (content.length > MAX_DOCUMENT_BYTES) {
      throw new Error('The official DBE source is too large to retrieve safely.');
    }

    const sourceName = `DBE CAPS ${phase.name} - ${document.title}`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="dbe-caps-source.pdf"');
    res.setHeader('Content-Length', String(content.length));
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Curriculum-Source-Name', sourceName);
    res.setHeader('X-Curriculum-Source-Filename', 'dbe-caps-source.pdf');
    res.setHeader('X-Curriculum-Source-Url', sourceUrl);
    res.setHeader('X-Curriculum-Source-Directory', phase.pageUrl);
    return res.status(200).send(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The official DBE source could not be retrieved.';
    return res.status(502).json({ error: message, directoryUrl: phase.pageUrl });
  }
}
