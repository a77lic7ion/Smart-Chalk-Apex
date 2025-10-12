import React, { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import api from '../src/services/api';
import { Loader } from './Loader';
import { EditableQuestionCard } from './EditableQuestionCard';

// A placeholder for the question type, which will be used in the next step
type GeneratedQuestion = {
  id: string;
  question: string;
  answer: string;
  grade: string;
  subject: string;
  curriculum: string;
  topic: string;
};

export const AdminDataCurationView: React.FC = () => {
  const [grade, setGrade] = useState('Grade 12');
  const [subject, setSubject] = useState('Physical Sciences');
  const [curriculums, setCurriculums] = useState('CAPS,IEB');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const handleSaveToDb = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccessMessage(null);

    try {
      const response = await api.post('/admin/save-questions', { questions: generatedQuestions });
      setSaveSuccessMessage(response.data.message);
      setGeneratedQuestions([]); // Clear the list after successful save
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An unknown error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateQuestion = (updatedQuestion: GeneratedQuestion) => {
    setGeneratedQuestions(currentQuestions =>
      currentQuestions.map(q => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
  };

  const handleDeleteQuestion = (questionId: string) => {
    setGeneratedQuestions(currentQuestions =>
      currentQuestions.filter(q => q.id !== questionId)
    );
  };

  const handleAddQuestion = (newQuestion: GeneratedQuestion) => {
    setGeneratedQuestions(currentQuestions => [...currentQuestions, newQuestion]);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setGeneratedQuestions([]);

    try {
      const response = await api.post('/admin/generate-questions', {
        grade,
        subject,
        curriculums,
      });
      setGeneratedQuestions(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
        <h1 className="text-2xl font-bold text-brand-navy">Admin Data Curation</h1>
        <p className="mt-1 text-slate-600 mb-6">
          Generate, review, and curate fine-tuning data for the AI models.
        </p>

        <form onSubmit={handleGenerate} className="space-y-4 p-4 border rounded-lg bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
            />
            <Input
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Input
              label="Curriculums (comma-separated)"
              value={curriculums}
              onChange={(e) => setCurriculums(e.target.value)}
              required
            />
          </div>
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            {isLoading ? 'Generating...' : 'Generate New Questions'}
          </Button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-center p-12">
          <Loader />
          <p className="mt-4 text-slate-500">Generating questions... this may take several minutes.</p>
        </div>
      )}

      {/* Interactive Staging Area */}
      {generatedQuestions.length > 0 && !isLoading && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-brand-navy">Review & Curate ({generatedQuestions.length})</h2>
              <p className="text-slate-600">Edit, delete, or add new questions before saving them to the database.</p>
            </div>
            <Button onClick={() => setIsAddModalOpen(true)} variant="secondary">
              Add Custom Question
            </Button>
          </div>
          <div className="space-y-4">
            {generatedQuestions.map(q => (
              <EditableQuestionCard
                key={q.id}
                questionData={q}
                onUpdate={handleUpdateQuestion}
                onDelete={handleDeleteQuestion}
              />
            ))}
          </div>
        </div>
      )}

      {generatedQuestions.length > 0 && !isLoading && (
        <div className="mt-8 pt-6 border-t">
            <Button
                onClick={handleSaveToDb}
                isLoading={isSaving}
                disabled={isSaving}
                size="lg"
            >
                Save and Commit to DB
            </Button>
            {saveSuccessMessage && <p className="text-green-600 mt-2">{saveSuccessMessage}</p>}
        </div>
      )}

      <AddCustomQuestionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddQuestion}
        defaultGrade={grade}
        defaultSubject={subject}
      />
    </main>
  );
};

// Modal for adding a new question manually
const AddCustomQuestionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (newQuestion: GeneratedQuestion) => void;
  defaultGrade: string;
  defaultSubject: string;
}> = ({ isOpen, onClose, onSave, defaultGrade, defaultSubject }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [topic, setTopic] = useState('');
  const [curriculum, setCurriculum] = useState('CAPS');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!question || !answer || !topic || !curriculum) {
      setError('All fields are required.');
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      question,
      answer,
      topic,
      curriculum,
      grade: defaultGrade,
      subject: defaultSubject,
    });
    // Reset form and close
    setQuestion('');
    setAnswer('');
    setTopic('');
    setCurriculum('CAPS');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-brand-navy">Add Custom Question</h2>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Input label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
          <Input label="Curriculum" value={curriculum} onChange={(e) => setCurriculum(e.target.value)} required />
          <textarea
            placeholder="Question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
          />
          <textarea
            placeholder="Answer..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full p-2 border rounded"
            rows={4}
          />
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} variant="primary">Save Question</Button>
        </div>
      </div>
    </div>
  );
};
