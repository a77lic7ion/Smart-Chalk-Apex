import React from 'react';
import type { TestGenerationParams, UserProfile } from '../types';

interface CurriculumSourcePanelProps {
  params: TestGenerationParams;
  user: UserProfile;
}

export const CurriculumSourcePanel: React.FC<CurriculumSourcePanelProps> = ({ params }) => {
  if (params.curriculum !== 'CAPS' && params.curriculum !== 'IEB') return null;

  const isIeb = params.curriculum === 'IEB';

  return (
    <section className="rounded-xl border border-slate-200 bg-brand-paper p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-yellow">Official curriculum grounding</p>
      <h3 className="mt-1 text-base font-bold text-brand-black">The official source is retrieved online</h3>
      <p className="mt-1 text-sm font-semibold text-brand-black">
        SmartChalk will retrieve the matching official DBE CAPS source for {params.grade} {params.subject} automatically when you generate.
      </p>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600">
        You do not need to download or upload a curriculum document. SmartChalk uses the relevant official source extract to ground the generation. The official source link is shown separately below the generated result and is never added to your document or export.
        {isIeb ? ' IEB uses CAPS for subject-content grounding; SmartChalk will not make unverified IEB-specific assessment claims.' : ''}
      </p>
    </section>
  );
};
