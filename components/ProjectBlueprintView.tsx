import React from 'react';
import { DocumentTextIcon, PencilSquareIcon, PresentationChartLineIcon, SparklesIcon, DatabaseIcon, BookOpenIcon, ExamIcon, HomeworkIcon, DocumentMagnifyingGlassIcon } from './Icons';
import { Button } from './Button';
import { AppView } from '../App';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-brand-navy mb-4 border-b-2 border-brand-green pb-2">{title}</h2>
        <div className="text-brand-dark-grey text-base leading-relaxed space-y-4">
            {children}
        </div>
    </section>
);

const FeatureCard: React.FC<{ icon: React.FC<any>, title: string, children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
    <div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
        <div className="flex items-center gap-4 mb-3">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-brand-navy">{title}</h3>
        </div>
        <div className="text-slate-600 pl-4 border-l-4 border-green-100 flex-grow">
            {children}
        </div>
    </div>
);

const TechPill: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = 'bg-slate-200 text-slate-800' }) => (
    <span className={`py-1 px-3 rounded-full text-sm font-medium ${className}`}>
        {children}
    </span>
);

export const ProjectBlueprintView: React.FC<{ setView: (view: AppView) => void }> = ({ setView }) => {
    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-brand-navy">Apex Academic Centre Technical Blueprint</h1>
                    <p className="text-lg text-slate-600 mt-2 max-w-3xl mx-auto">An overview of the project's architecture, features, and technology stack.</p>
                </div>

                <Section title="Admin Tools">
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-semibold text-brand-navy mb-3">Data Curation</h3>
                        <p className="text-slate-600 mb-4">
                            Use the data curation tool to generate new fine-tuning data, review it, and save it to the database.
                        </p>
                        <Button onClick={() => setView('adminDataCuration')} variant="primary">
                            Go to Data Curation Tool &rarr;
                        </Button>
                    </div>
                </Section>

                <Section title="Introduction">
                    <p>
                        Apex Academic Centre is a web-based platform designed to transform traditional educational materials, such as tests and mock exams, into structured, reusable datasets. Powered by modern AI APIs, including the Google Gemini API, it empowers educators to digitize, analyze, and generate curriculum-aligned content with ease. The application serves as a comprehensive tool for data extraction, test creation, and presentation generation, all within a responsive and user-friendly interface.
                    </p>
                </Section>

                <Section title="Core Features">
                    <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
                        <FeatureCard icon={PencilSquareIcon} title="Manual Exam Builder">
                             <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>Side-by-side editor for manually creating structured exams.</li>
                                <li>Supports pasting content, including images, directly into fields.</li>
                                <li>Flexible structure for sections, main questions, and sub-questions.</li>
                                <li>Saves exams locally and allows export to print-ready DOCX format.</li>
                            </ul>
                        </FeatureCard>
                        <FeatureCard icon={SparklesIcon} title="Test Generator">
                             <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>Generates new tests from user-defined parameters.</li>
                                <li>Specifies topic, question types, and Bloom's Taxonomy level.</li>
                                <li>Allows review, editing, and saving of generated tests.</li>
                                <li>Supports adding custom questions with images.</li>
                            </ul>
                        </FeatureCard>
                        <FeatureCard icon={ExamIcon} title="Formal Exam Formatter">
                             <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>Converts generated or parsed tests into a formal, print-ready exam format.</li>
                                <li>Includes a professional cover page with student details.</li>
                                <li>Provides ample writing space for student answers.</li>
                                <li>Exports both the question paper and a separate marking memorandum.</li>
                            </ul>
                        </FeatureCard>
                         <FeatureCard icon={HomeworkIcon} title="Homework Generator">
                             <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>Creates homework sheets from scratch or based on existing content.</li>
                                <li>Generates questions that reinforce concepts from a saved test, lesson, or presentation.</li>
                                <li>Produces a formatted PDF with student details and instructions.</li>
                                <li>Includes a separate, complete answer key.</li>
                            </ul>
                        </FeatureCard>
                         <FeatureCard icon={BookOpenIcon} title="Lesson Generator">
                             <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>Generates full lesson plans for 30 or 60 min durations.</li>
                                <li>Content includes objectives, activities, and assessments.</li>
                                <li>AI suggests relevant images with detailed prompts.</li>
                                <li>Saves full lessons and assessment questions locally.</li>
                            </ul>
                        </FeatureCard>
                         <FeatureCard icon={PresentationChartLineIcon} title="Slides Generator">
                             <ul className="list-disc list-inside space-y-2 text-sm">
                                <li>Scaffolds presentations from a topic and outline.</li>
                                <li>Integrates royalty-free stock photo search via the Pexels API.</li>
                                <li>Allows picking images from a personal, reusable library.</li>
                                <li>Saves full presentations and images locally for offline use.</li>
                            </ul>
                        </FeatureCard>
                    </div>
                </Section>
                
                <Section title="Technical Architecture">
                     <p className="mb-6">
                        The application is designed as a flexible, client-side application. It features a modular service layer that allows for plug-and-play integration with various AI providers. All data is persisted locally in the user's browser, ensuring privacy and offline functionality.
                    </p>
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                         <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 text-center font-semibold">
                            {/* Frontend */}
                            <div className="p-4 bg-sky-50 text-sky-800 rounded-lg flex flex-col justify-center items-center border-2 border-sky-200">
                                <span className="text-lg">Frontend</span>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    <TechPill className="bg-sky-200 text-sky-900">React</TechPill>
                                    <TechPill className="bg-sky-200 text-sky-900">Tailwind</TechPill>
                                </div>
                            </div>

                            <div className="self-center text-4xl font-light text-slate-400 mx-4 transform md:rotate-0 rotate-90">→</div>

                            {/* Service Layer */}
                             <div className="p-4 bg-green-50 text-green-800 rounded-lg flex flex-col justify-center items-center border-2 border-green-200">
                                <span className="text-lg">AI Service Layer</span>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                     <TechPill className="bg-green-200 text-green-900">Provider Agnostic</TechPill>
                                </div>
                            </div>
                            
                            <div className="self-center text-4xl font-light text-slate-400 mx-4 transform md:rotate-0 rotate-90">→</div>

                            {/* Backends */}
                             <div className="p-4 bg-slate-50 text-slate-800 rounded-lg flex flex-col justify-center items-center border-2 border-slate-200 space-y-3">
                                 <div className="flex flex-wrap gap-2 justify-center">
                                    <TechPill className="bg-emerald-100 text-emerald-800">Gemini</TechPill>
                                    <TechPill className="bg-slate-200 text-slate-800">OpenAI</TechPill>
                                    <TechPill className="bg-orange-100 text-orange-800">Ollama</TechPill>
                                 </div>
                                 <div className="flex flex-wrap gap-2 justify-center">
                                    <TechPill className="bg-teal-100 text-teal-800">Pexels API</TechPill>
                                 </div>
                            </div>
                        </div>
                    </div>
                </Section>
                
                <Section title="Technology Stack">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div>
                            <h3 className="font-semibold text-lg mb-2 text-brand-navy">Frontend</h3>
                            <ul className="list-disc list-inside space-y-1">
                                <li><TechPill>React & TypeScript</TechPill> for component architecture.</li>
                                <li><TechPill>Tailwind CSS</TechPill> for utility-first styling.</li>
                                <li><TechPill>React Context</TechPill> for global state management.</li>
                                <li><TechPill>Import Maps</TechPill> for a buildless environment.</li>
                            </ul>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg mb-2 text-brand-navy">AI & Image Services</h3>
                            <ul className="list-disc list-inside space-y-1">
                                <li><TechPill className="bg-emerald-100 text-emerald-800">@google/genai</TechPill> for Gemini.</li>
                                <li><TechPill className="bg-slate-200">OpenAI REST API</TechPill> for GPT.</li>
                                <li><TechPill className="bg-orange-100 text-orange-800">Ollama</TechPill> for local LLMs.</li>
                                <li><TechPill className="bg-teal-100 text-teal-800">Pexels API</TechPill> for stock images.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg mb-2 text-brand-navy">Data Persistence</h3>
                             <ul className="list-disc list-inside space-y-1">
                                <li><TechPill className="bg-blue-100 text-blue-800">Dexie.js</TechPill> as an IndexedDB wrapper.</li>
                                <li><TechPill className="bg-blue-100 text-blue-800">IndexedDB</TechPill> for robust client-side storage.</li>
                            </ul>
                        </div>
                    </div>
                </Section>

                <Section title="Conclusion">
                    <p>
                        The Apex Academic Centre platform is a powerful proof-of-concept demonstrating how modern AI capabilities can be harnessed in a client-side web application to create sophisticated, domain-specific tools for educators. Its modular architecture, multi-provider support, and focus on a practical workflow make it a valuable asset for digitizing and generating educational content.
                    </p>
                </Section>
            </div>
        </main>
    );
};