import React from 'react';
import type { CurriculumEvidence } from '../types';

interface OfficialSourcesFooterProps {
  evidence?: CurriculumEvidence;
}

export const OfficialSourcesFooter: React.FC<OfficialSourcesFooterProps> = ({ evidence }) => {
  if (!evidence) return null;

  return (
    <aside className="mt-6 border-t border-slate-200 pt-4" aria-label="Official source used for this generation">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Official source used</p>
      <a
        href={evidence.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex max-w-full items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-brand-black underline decoration-brand-yellow decoration-2 underline-offset-4 hover:border-brand-yellow hover:bg-brand-yellow"
      >
        {evidence.sourceName}
      </a>
      <p className="mt-2 text-xs leading-5 text-slate-500">This reference is shown only here for verification. It is not included in generated documents or exports.</p>
    </aside>
  );
};
