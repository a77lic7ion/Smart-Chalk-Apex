
import React, { useState, useCallback, useEffect } from 'react';
import { db } from './db';
import { Header } from './components/Header';
import { TestGenerator } from './components/TestGenerator';
import { SlidesGenerator } from './components/SlidesGenerator';
import { LessonGenerator } from './components/LessonGenerator';
import { TemplatedTestView } from './components/TemplatedTestView';
import { MyContentView } from './components/MyContentView';
import { SettingsView } from './components/SettingsView';
import type { UserProfile, ContentType } from './types';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ADMIN_EMAILS } from './config';
import { HomeworkGenerator } from './components/HomeworkGenerator';
import { Footer } from './components/Footer';
import { ManualExamBuilderView } from './components/ManualExamBuilderView';
import { startSyncService } from './services/syncService';


export type AppView = 'dashboard' | 'manualExamBuilder' | 'testGenerator' | 'slidesGenerator' | 'lessonGenerator' | 'exam' | 'homeworkGenerator' | 'myContent' | 'settings';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState<AppView>('dashboard');
  const [contentToLoad, setContentToLoad] = useState<{type: ContentType, id: string} | null>(null);

  const handleLoginSuccess = (profile: UserProfile) => {
    // Defensive check to prevent crash if email is not a string
    const userIsAdmin = profile && typeof profile.email === 'string'
        ? ADMIN_EMAILS.includes(profile.email.toLowerCase())
        : false;
    setUser(profile);
    setIsAdmin(userIsAdmin);
    setView('dashboard');
    startSyncService();
  };
  
  const handleLogout = () => {
      setUser(null);
      setIsAdmin(false);
      setView('dashboard');
  }

  const handleContentLoad = (type: ContentType, id: string) => {
    const viewMap: Record<ContentType, AppView | null> = {
        'test': 'testGenerator',
        'presentation': 'slidesGenerator',
        'lesson': 'lessonGenerator',
        'exam': 'exam',
        'homework': 'homeworkGenerator',
        'parsedExam': 'manualExamBuilder', // Was 'dataGenerator'
        'manualExam': 'manualExamBuilder'  // Was 'dataGenerator'
    };
    const targetView = viewMap[type];
    if (targetView) {
      setView(targetView);
    }
    setContentToLoad({ type, id });
  };
  
  const handleFormatExam = (type: 'test' | 'lesson' | 'presentation' | 'parsedExam' | 'manualExam', id: string) => {
    setView('exam');
    setContentToLoad({ type, id });
  };

  const handleCreateHomework = (type: 'test' | 'lesson' | 'presentation', id: string) => {
    setView('homeworkGenerator');
    setContentToLoad({ type, id });
  }

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const renderMainView = () => {
    switch(view) {
        case 'dashboard':
            return <DashboardView user={user} setView={setView} isAdmin={isAdmin} />;
        case 'manualExamBuilder':
            return isAdmin ? <ManualExamBuilderView user={user} loadId={contentToLoad?.id ?? null} loadType={contentToLoad?.type ?? null} onDidLoad={() => setContentToLoad(null)} /> : null;
        case 'testGenerator':
            return <TestGenerator user={user} loadId={contentToLoad?.type === 'test' ? contentToLoad.id : null} onDidLoad={() => setContentToLoad(null)} />;
        case 'slidesGenerator':
            return <SlidesGenerator user={user} loadId={contentToLoad?.type === 'presentation' ? contentToLoad.id : null} onDidLoad={() => setContentToLoad(null)} />;
        case 'lessonGenerator':
            return <LessonGenerator user={user} loadId={contentToLoad?.type === 'lesson' ? contentToLoad.id : null} onDidLoad={() => setContentToLoad(null)} />;
        case 'exam':
            return <TemplatedTestView user={user} loadId={contentToLoad?.id ?? null} loadType={contentToLoad?.type ?? null} onDidLoad={() => setContentToLoad(null)} />;
        case 'homeworkGenerator':
            return <HomeworkGenerator user={user} loadId={contentToLoad?.id ?? null} loadType={contentToLoad?.type ?? null} onDidLoad={() => setContentToLoad(null)} />;
        case 'myContent':
            return <MyContentView user={user} onContentLoad={handleContentLoad} onFormatExam={handleFormatExam} onCreateHomework={handleCreateHomework} isAdmin={isAdmin} />;
        case 'settings':
            return <SettingsView user={user} isAdmin={isAdmin} />;
        default:
             return <DashboardView user={user} setView={setView} isAdmin={isAdmin} />;
    }
  }

  return (
    <div className="min-h-screen bg-brand-light-grey font-sans text-brand-dark-grey flex flex-col">
      <Header 
        currentView={view} 
        setView={setView}
        user={user}
        onLogout={handleLogout}
        isAdmin={isAdmin}
       />
      <div className="flex-grow">
        {renderMainView()}
      </div>

      <Footer />
    </div>
  );
};

export default App;
