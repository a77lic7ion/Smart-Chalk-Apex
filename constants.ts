import type { Curriculum } from './types';

export const GRADES: string[] = [
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
    'Tertiary First Year',
    'Tertiary Second Year',
    'Tertiary Third Year',
    'Postgraduate',
    'Other'
];

export const SUBJECTS: string[] = [
    'Accounting',
    'Afrikaans First Additional Language',
    'Afrikaans Home Language',
    'Agricultural Management Practices',
    'Agricultural Sciences',
    'Agricultural Technology',
    'Business Studies',
    'Civil Technology',
    'Computer Applications Technology (CAT)',
    'Consumer Studies',
    'Dance Studies',
    'Design',
    'Dramatic Arts',
    'Economics',
    'Electrical Technology',
    'Engineering Graphics and Design (EGD)',
    'English First Additional Language',
    'English Home Language',
    'Geography',
    'History',
    'Hospitality Studies',
    'Information Technology (IT)',
    'IsiNdebele Home Language',
    'IsiXhosa Home Language',
    'IsiZulu Home Language',
    'Life Orientation',
    'Life Sciences',
    'Mathematical Literacy',
    'Mathematics',
    'Mechanical Technology',
    'Music',
    'Physical Sciences',
    'Religion Studies',
    'Sepedi Home Language',
    'Sesotho Home Language',
    'Setswana Home Language',
    'Siswati Home Language',
    'South African Sign Language',
    'Technical Mathematics',
    'Technical Sciences',
    'Tourism',
    'Tshivenda Home Language',
    'Visual Arts',
    'Xitsonga Home Language',
    'Other',
];

export const CURRICULUM_OPTIONS: Curriculum[] = ['CAPS', 'IEB', 'Cambridge', 'Other'];

// --- Test Generator Constants ---

export const COMPREHENSIVE_SUBJECT_OPTIONS = [
  { value: 'Mathematics (Senior Phase)', label: 'Mathematics (Senior Phase)' },
  { value: 'Life Sciences (FET)', label: 'Life Sciences (FET)' },
  { value: 'Physical Sciences (FET)', label: 'Physical Sciences (FET)' },
  { value: 'History (FET)', label: 'History (FET)' },
  { value: 'Geography (FET)', label: 'Geography (FET)' },
  { value: 'English Home Language (FET)', label: 'English Home Language (FET)' },
  ...SUBJECTS.map(s => ({ value: s, label: s }))
].filter((v,i,a)=>a.findIndex(t=>(t.value === v.value))===i) // unique
.sort((a, b) => a.label.localeCompare(b.label));

export const GRADES_OPTIONS = GRADES.map(g => ({ value: g, label: g }));
export const CURRICULUM_OPTS_FOR_SELECT = CURRICULUM_OPTIONS.map(c => ({ value: c, label: c }));

export const BLOOMS_LEVEL_OPTIONS = [
    { value: 'Remembering', label: 'Remembering - Recall facts and basic concepts' },
    { value: 'Understanding', label: 'Understanding - Explain ideas or concepts' },
    { value: 'Applying', label: 'Applying - Use information in new situations' },
    { value: 'Analyzing', label: 'Analyzing - Draw connections among ideas' },
    { value: 'Evaluating', label: 'Evaluating - Justify a stand or decision' },
    { value: 'Creating', label: 'Creating - Produce new or original work' },
    { value: 'Balanced', label: 'Balanced - A mix of all levels' },
];

export const QUESTION_TYPE_SUGGESTIONS = [
  '10 multiple choice questions, 5 short answer questions, and 2 essay questions. Total marks: 50.',
  'A case study with 5 analytical questions. Total marks: 30.',
  '20 marks of source-based questions and a 30-mark essay.',
  'Practical investigation with data analysis and conclusion questions. Total marks: 40.',
];

export const TEST_STRUCTURE_PRESETS = [
  { label: "Quick Quiz", value: "5 multiple choice questions, 2 short answer questions. Total: 15 marks." },
  { label: "Class Test", value: "10 multiple choice, 5 short answer, 1 paragraph question. Total: 30 marks." },
  { label: "Formal Exam", value: "Section A: 15 marks multiple choice. Section B: 25 marks source-based/case study. Section C: 10 marks long-form essay. Total: 50 marks." },
];

export const SUBJECT_TOPIC_SUGGESTIONS: { [key: string]: string[] } = {
  'Default': [
    'Introduction to Core Concepts',
    'Historical Overview & Key Figures',
    'Practical Applications & Case Studies',
    'Comparing and Contrasting Theories',
    'Ethical Considerations & Debates',
    'End-of-Term Revision Summary',
    'Glossary of Key Terminology'
  ]
};