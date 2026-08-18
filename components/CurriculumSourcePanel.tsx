import React, { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Curriculum, CurriculumSourceRecord, TestGenerationParams, UserProfile } from '../types';
import { parseFile } from '../utils/fileParser';
import { generateUUID } from '../utils/uuidCompat';
import { getOfficialCurriculumDirectories } from '../services/curriculumGroundingService';
import { DocumentArrowDownIcon, TrashIcon, UploadIcon } from './Icons';

interface CurriculumSourcePanelProps {
  params: TestGenerationParams;
  user: UserProfile;
}

const sourceMatches = (source: CurriculumSourceRecord, params: TestGenerationParams) =>
  source.grade === params.grade && source.subject === params.subject;

export const CurriculumSourcePanel: React.FC<CurriculumSourcePanelProps> = ({ params, user }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [publisher, setPublisher] = useState<'DBE' | 'IEB'>('DBE');
  const [sourceUrl, setSourceUrl] = useState('');

  const allSources = useLiveQuery(
    () => db.curriculumSources.where('userId').equals(user.sub).toArray(),
    [user.sub],
    [],
  );

  const matchingSources = useMemo(
    () => allSources.filter(source => sourceMatches(source, params)),
    [allSources, params.grade, params.subject],
  );

  const hasDbeSource = matchingSources.some(source => source.publisher === 'DBE' && source.curriculum === 'CAPS');
  const hasIebGuidance = matchingSources.some(source => source.publisher === 'IEB');
  const directories = getOfficialCurriculumDirectories(params.curriculum);

  const openImport = (nextPublisher: 'DBE' | 'IEB') => {
    setPublisher(nextPublisher);
    setSourceUrl(nextPublisher === 'IEB' ? directories.iebGuidelines?.url ?? '' : directories.dbeCaps.url);
    setError(null);
    setNotice(null);
    inputRef.current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setNotice(null);
    try {
      const text = await parseFile(file);
      const sourceText = text.replace(/\s+/g, ' ').trim().slice(0, 500000);
      if (sourceText.length < 500) {
        throw new Error('The document has too little readable text. Please use the official text-based PDF or DOCX, not a scanned image-only file.');
      }

      const record: CurriculumSourceRecord = {
        id: generateUUID(),
        userId: user.sub,
        curriculum: publisher === 'DBE' ? 'CAPS' : 'IEB',
        publisher,
        name: file.name,
        sourceUrl: sourceUrl.trim() || (publisher === 'DBE' ? directories.dbeCaps.url : directories.iebGuidelines?.url || ''),
        sourceText,
        grade: params.grade,
        subject: params.subject,
        importedAt: Date.now(),
        lastVerifiedAt: Date.now(),
        syncStatus: 'dirty',
      };

      await db.curriculumSources.add(record);
      setNotice(`${publisher} source imported for ${params.grade} ${params.subject}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The official curriculum source could not be imported.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this local curriculum source? Existing generated content will keep its saved evidence.')) return;
    await db.curriculumSources.delete(id);
  };

  const status = params.curriculum === 'CAPS'
    ? (hasDbeSource ? 'DBE CAPS source ready' : 'Official DBE CAPS source required')
    : params.curriculum === 'IEB'
      ? (hasDbeSource ? (hasIebGuidance ? 'DBE CAPS and IEB guidance ready' : 'DBE CAPS source ready; IEB guidance optional') : 'Official DBE CAPS source required')
      : 'No South African source requirement for this curriculum selection';

  return (
    <section className="rounded-xl border border-slate-200 bg-brand-paper p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-yellow">Source-grounded generation</p>
          <h3 className="mt-1 text-base font-bold text-brand-black">South African curriculum source</h3>
          <p className={`mt-1 text-sm font-semibold ${hasDbeSource || (params.curriculum !== 'CAPS' && params.curriculum !== 'IEB') ? 'text-emerald-700' : 'text-brand-black'}`}>{status}</p>
          <p className="mt-1 max-w-2xl text-xs text-slate-600">For CAPS and IEB, SmartChalk generates only after an official DBE CAPS document for the selected grade and subject is imported. IEB uses CAPS for subject content; import IEB guidance as an additional assessment reference where available.</p>
        </div>
        <button type="button" onClick={() => setIsOpen(open => !open)} className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-brand-black hover:border-brand-yellow hover:bg-brand-yellow">
          {isOpen ? 'Hide sources' : 'Manage sources'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <a href={directories.dbeCaps.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-brand-black hover:border-brand-yellow hover:bg-brand-yellow">
              <DocumentArrowDownIcon className="h-4 w-4" /> Open DBE CAPS documents
            </a>
            {params.curriculum === 'IEB' && directories.iebGuidelines && (
              <a href={directories.iebGuidelines.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-brand-black hover:border-brand-yellow hover:bg-brand-yellow">
                <DocumentArrowDownIcon className="h-4 w-4" /> Open IEB assessment guidance
              </a>
            )}
          </div>

          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3">
            <p className="text-sm font-semibold text-brand-black">Import the official document you downloaded</p>
            <p className="mt-1 text-xs text-slate-600">Select the DBE CAPS PDF/DOCX for this exact grade and subject. The document text is stored locally and the relevant excerpt is included in the prompt sent to your selected AI provider when you generate content.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => openImport('DBE')} disabled={isImporting} className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-3 py-2 text-sm font-bold text-brand-black hover:bg-brand-black hover:text-brand-yellow disabled:opacity-60">
                <UploadIcon className="h-4 w-4" /> {isImporting && publisher === 'DBE' ? 'Importing…' : 'Import DBE CAPS source'}
              </button>
              {params.curriculum === 'IEB' && (
                <button type="button" onClick={() => openImport('IEB')} disabled={isImporting} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-brand-black hover:border-brand-yellow hover:bg-brand-yellow disabled:opacity-60">
                  <UploadIcon className="h-4 w-4" /> {isImporting && publisher === 'IEB' ? 'Importing…' : 'Import IEB guidance'}
                </button>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={handleFile} className="hidden" />
          </div>

          {error && <p role="alert" className="rounded-lg border border-slate-300 bg-white p-3 text-sm font-semibold text-brand-black">{error}</p>}
          {notice && <p role="status" className="rounded-lg border border-brand-yellow bg-white p-3 text-sm font-semibold text-brand-black">{notice}</p>}

          {matchingSources.length > 0 && (
            <div className="space-y-2">
              {matchingSources.map(source => (
                <div key={source.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-black">{source.publisher}: {source.name}</p>
                    <a href={source.sourceUrl} target="_blank" rel="noreferrer" className="block truncate text-xs text-slate-500 underline">{source.sourceUrl}</a>
                  </div>
                  <button type="button" onClick={() => handleDelete(source.id)} title="Remove curriculum source" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-brand-black hover:bg-brand-black hover:text-brand-yellow">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
