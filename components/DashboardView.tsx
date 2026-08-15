import React from 'react';
import type { UserProfile } from '../types';
import type { AppView } from '../App';
import { ProjectBlueprintView } from './ProjectBlueprintView';
import { Button } from './Button';
import { NotepadPencilIconSimple, PresentationChartLineIconSimple, BookOpenIconSimple, ExamIconSimple, GlobeAltIcon } from './Icons';

interface DashboardProps {
    user: UserProfile;
    setView: (view: AppView) => void;
    isAdmin: boolean;
}

const ShortcutCard: React.FC<{
  icon: React.FC<any>;
  title: string;
  description: string;
  onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
        <div className="flex items-center gap-4 mb-3">
            <div className="bg-yellow-100 text-brand-yellow p-3 rounded-lg">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold text-brand-black">{title}</h3>
        </div>
        <p className="text-slate-600 text-sm mb-4 flex-grow">{description}</p>
        <Button onClick={onClick} variant="secondary" className="mt-auto self-start">
            Start Creating &rarr;
        </Button>
    </div>
);


export const DashboardView: React.FC<DashboardProps> = ({ user, setView, isAdmin }) => {
    // If the user is an admin, show the project blueprint view.
    if (isAdmin) {
        return <ProjectBlueprintView setView={setView} />;
    }

    // Otherwise, show the new modern dashboard for regular users.
    const firstName = user.name ? user.name.split(' ')[0] : 'Educator';

    return (
        <main className="bg-slate-50/50">
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-5xl mx-auto space-y-16">
                    {/* Hero Section */}
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-brand-black">
                            Welcome back, {firstName}!
                        </h1>
                        <p className="text-lg text-slate-600 mt-3 max-w-2xl mx-auto">
                            Reclaim your time and elevate your teaching. Let's automate your workload.
                        </p>
                    </div>

                    {/* Quick Start Shortcuts */}
                    <div>
                        <h2 className="text-2xl font-bold text-brand-black mb-6 text-center">Get Started Quickly</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                            <ShortcutCard
                                icon={NotepadPencilIconSimple}
                                title="Test Generator"
                                description="Instantly create curriculum-aligned tests and quizzes on any topic, complete with answers."
                                onClick={() => setView('testGenerator')}
                            />
                            <ShortcutCard
                                icon={BookOpenIconSimple}
                                title="Lesson Planner"
                                description="Generate comprehensive lesson plans with objectives, activities, and assessment questions in minutes."
                                onClick={() => setView('lessonGenerator')}
                            />
                            <ShortcutCard
                                icon={PresentationChartLineIconSimple}
                                title="Slides Creator"
                                description="Turn your lesson topics into engaging presentations, complete with AI-suggested images."
                                onClick={() => setView('slidesGenerator')}
                            />
                             <ShortcutCard
                                icon={ExamIconSimple}
                                title="Exam Creator"
                                description="Manually build custom exams from scratch or parse existing documents into a structured format."
                                onClick={() => setView('manualExamBuilder')}
                            />
                        </div>
                    </div>
                    
                    {/* Value Proposition Section */}
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                         <h2 className="text-2xl font-bold text-brand-black mb-4 text-center">Designed for South African Educators</h2>
                         <div className="flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
                            <div className="text-brand-yellow p-4 bg-yellow-50 rounded-full">
                                <GlobeAltIcon className="h-20 w-20" />
                            </div>
                            <div className="space-y-4">
                                <p className="text-slate-700">
                                    Our platform understands the unique needs of teachers in South Africa. We support multiple curricula including <strong className="text-brand-yellow">CAPS, IEB, and Cambridge</strong>, ensuring the content you generate is always relevant and compliant.
                                </p>
                                 <p className="text-slate-700">
                                    From generating a Grade 5 Life Skills test to a Grade 12 Physical Sciences lesson plan, our AI is trained to assist you. Save hours of prep time and focus on what matters most: teaching.
                                 </p>
                            </div>
                         </div>
                    </div>

                </div>
            </div>
        </main>
    );
};
