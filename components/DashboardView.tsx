import { useLiveQuery } from 'dexie-react-hooks';
import type { UserProfile } from '../types';
import type { AppView } from '../App';
import { db } from '../db';

interface DashboardProps {
  user: UserProfile;
  setView: (view: AppView) => void;
  isAdmin: boolean;
}

const quickActions: { label: string; description: string; view: AppView }[] = [
  { label: 'Create a test', description: 'Build a curriculum-aligned assessment', view: 'testGenerator' },
  { label: 'Plan a lesson', description: 'Draft objectives, activities, and checks', view: 'lessonGenerator' },
  { label: 'Build homework', description: 'Create a ready-to-share homework sheet', view: 'homeworkGenerator' },
  { label: 'Make slides', description: 'Start a lesson presentation', view: 'slidesGenerator' },
];

const formatContentCount = (count: number) => String(count).padStart(2, '0');

export const DashboardView: React.FC<DashboardProps> = ({ user, setView }) => {
  const savedContentCount = useLiveQuery(
    async () => {
      const counts = await Promise.all([
        db.savedTests.count(),
        db.presentations.count(),
        db.lessonPlans.count(),
        db.savedExams.count(),
        db.savedHomework.count(),
        db.savedManualExams.count(),
      ]);
      return counts.reduce((total, count) => total + count, 0);
    },
    [],
    0,
  );

  const firstName = user.name?.split(' ')[0] || 'Educator';
  const localHour = new Date().getHours();
  const greeting = localHour < 12 ? 'Good morning' : localHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="min-h-full bg-brand-paper">
      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <section className="flex flex-col gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-brand-yellow">SmartChalk workspace</p>
            <h1 className="text-4xl font-black tracking-tight text-brand-black sm:text-5xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-3 max-w-xl text-base text-slate-600 sm:text-lg">Build better learning materials from one focused workspace.</p>
          </div>
          <button
            type="button"
            onClick={() => setView('testGenerator')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 py-3 text-sm font-black uppercase tracking-wide text-brand-black transition-transform duration-150 hover:bg-brand-black hover:text-brand-yellow active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-brand-yellow focus:ring-offset-2"
          >
            <span aria-hidden="true">+</span>
            Create new
          </button>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Saved content</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="text-5xl font-black leading-none text-brand-yellow">{formatContentCount(savedContentCount)}</p>
              <p className="pb-1 text-sm text-slate-500">Stored locally</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Creation tools</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="text-5xl font-black leading-none text-brand-yellow">05</p>
              <p className="pb-1 text-sm text-slate-500">Ready to use</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Workspace backup</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="text-4xl font-black leading-none text-brand-yellow">JSON</p>
              <p className="pb-1 text-sm text-slate-500">Export in Settings</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-yellow">Recent activity</p>
                <h2 className="mt-2 text-2xl font-black text-brand-black">Your local workspace</h2>
              </div>
              <button
                type="button"
                onClick={() => setView('myContent')}
                className="text-sm font-bold text-brand-charcoal underline decoration-brand-yellow decoration-2 underline-offset-4 transition-colors hover:text-brand-yellow focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              >
                View content
              </button>
            </div>

            <div className="py-8">
              <div className="flex min-h-40 flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
                <p className="text-lg font-bold text-brand-black">Your workspace is ready.</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                  New tests, exams, lessons, homework, and slide decks are saved here in your browser as you create them.
                </p>
              </div>
            </div>
          </div>

          <aside className="quick-start-panel rounded-2xl border-2 border-brand-yellow bg-brand-black p-6 shadow-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-yellow">Quick start</p>
            <h2 className="mt-2 text-2xl font-black text-white">Start building</h2>
            <div className="mt-6 space-y-3">
              {quickActions.map(action => (
                <button
                  key={action.view}
                  type="button"
                  onClick={() => setView(action.view)}
                  className="group flex w-full items-center justify-between gap-4 rounded-xl bg-brand-yellow px-4 py-4 text-left text-sm font-black text-brand-black transition-transform duration-150 hover:bg-white active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <span>
                    <span className="block">{action.label}</span>
                    <span className="mt-1 block text-xs font-medium text-brand-charcoal/80">{action.description}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg transition-transform duration-150 group-hover:translate-x-1">→</span>
                </button>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};
