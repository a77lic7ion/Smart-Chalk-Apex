
import { saveAs } from 'file-saver';
import PptxGenJS from 'pptxgenjs';
import { db } from '../db';
import type { SavedTest, Presentation, Slide, ImagePlaceholder, LessonPlan, FormalTestParams, TrainingQuestion, SavedHomework, ManualExam, ParsedExamData, ExamQuestion, Curriculum } from '../types';
import { Document, Paragraph, TextRun, ImageRun, Packer as DocxPacker, HeadingLevel, AlignmentType, convertInchesToTwip, Header, Footer, PageNumber, PageBorderDisplay, PageBorders, PageBorderOffsetFrom, BorderStyle, ISectionOptions, HeightRule } from 'docx';

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const dataPart = base64.split(',')[1];
    if (!dataPart) {
        throw new Error("Invalid base64 string: missing data part.");
    }
    const binaryString = window.atob(dataPart);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

const getLogoAsArrayBuffer = async (url: string): Promise<ArrayBuffer> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch logo from ${url}: ${response.statusText}`);
    return await response.arrayBuffer();
};

const getImageDimensions = (base64String: string): Promise<{width: number, height: number}> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = (err) => {
            const errorMsg = typeof err === 'string' ? err : 'Image loading failed';
            reject(new Error(errorMsg));
        };
        img.src = base64String;
    });
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return `data:image/png;base64,${window.btoa(binary)}`;
};

const getHeaderLogoBuffer = async (): Promise<ArrayBuffer> => {
    try {
        return await getLogoAsArrayBuffer('/Header2.png');
    } catch (error) {
        console.error("Failed to fetch header logo for DOCX:", error);
        throw error;
    }
};

const getFooterLogoBuffer = async (): Promise<ArrayBuffer> => {
    try {
        return await getLogoAsArrayBuffer('/logo1.png');
    } catch (error) {
        console.error("Failed to fetch footer logo for DOCX:", error);
        throw error;
    }
};

// --- DOCX Helper Functions ---

const createFooter = (logoBuffer: ArrayBuffer) => {
    return new Footer({
        children: [
            new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                    new ImageRun({
                        data: logoBuffer,
                        transformation: { height: 30, width: 120 },
                        type: 'png',
                    }),
                    new TextRun({
                        children: ["  Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES],
                        font: "Montserrat"
                    }),
                ],
            }),
        ],
    });
};

const createCoverPage = async (
    params: {
        name: string;
        subject: string;
        grade: string;
        curriculum: string;
        totalMarks?: string;
        timeLimit?: string;
        testType?: string;
    },
    logoBuffer: ArrayBuffer
): Promise<Paragraph[]> => {

    const logoBase64 = arrayBufferToBase64(logoBuffer);
    const dimensions = await getImageDimensions(logoBase64);
    const targetWidth = 300;
    const aspectRatio = dimensions.height / dimensions.width;
    const targetHeight = Math.round(targetWidth * aspectRatio);
    
    // Font sizes are in half-points, so 24pt = 48 size.
    const HEADING_SIZE = 60; // 30pt
    const SUBHEADING_SIZE = 48; // 24pt
    const DETAIL_SIZE = 28; // 14pt

    return [
        new Paragraph({ spacing: { before: 1500 } }), 

        new Paragraph({
            children: [new ImageRun({ data: logoBuffer, transformation: { width: targetWidth, height: targetHeight }, type: 'png' })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        
        new Paragraph({
            children: [new TextRun({ text: params.name, size: HEADING_SIZE, bold: true, font: "Aquatico" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 800 },
        }),
        
        new Paragraph({
            children: [new TextRun({ text: `Subject: ${params.subject}`, size: SUBHEADING_SIZE, font: "Montserrat" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
        }),
        new Paragraph({
            children: [new TextRun({ text: `Grade: ${params.grade}`, size: DETAIL_SIZE, font: "Montserrat" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
        }),
        new Paragraph({
            children: [new TextRun({ text: `Curriculum: ${params.curriculum}`, size: DETAIL_SIZE, font: "Montserrat" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        
        ...(params.testType ? [new Paragraph({
            children: [new TextRun({ text: `Type: ${params.testType}`, size: DETAIL_SIZE, font: "Montserrat" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        })] : []),
        ...(params.totalMarks ? [new Paragraph({
            children: [new TextRun({ text: `Total Marks: ${params.totalMarks}`, size: DETAIL_SIZE, font: "Montserrat" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        })] : []),
        ...(params.timeLimit ? [new Paragraph({
            children: [new TextRun({ text: `Time Limit: ${params.timeLimit}`, size: DETAIL_SIZE, font: "Montserrat" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
        })] : []),
        
        new Paragraph({ text: "", pageBreakBefore: true }),
    ];
};

const createRuledLine = () => new Paragraph({
    children: [new TextRun({ text: "____________________________________________________________________", color: "BFBFBF", font: "Montserrat" })],
    spacing: { after: 150 },
});

const createDocxQuestion = async (q: TrainingQuestion | ExamQuestion, index: number, type: 'questions' | 'memo'): Promise<Paragraph[]> => {
    const questionNumberText = 'questionNumber' in q && q.questionNumber ? q.questionNumber : `Question ${index + 1}`;
    const questionText = 'text' in q ? q.text : q.question;
    const answerText = 'answer' in q ? q.answer : ('annexure' in q && q.annexure ? q.annexure.text : "No answer provided.");
    const marksText = 'marks' in q && q.marks ? q.marks : '';

    const content: Paragraph[] = [
        new Paragraph({
            children: [
                new TextRun({ text: `${questionNumberText} `, bold: true, size: 28, font: "Aquatico" }),
                new TextRun({ text: `\t\t${marksText}`, size: 24, bold: true, font: "Montserrat" }),
            ],
            spacing: { after: 200 },
            keepNext: true,
        }),
        new Paragraph({
            children: [new TextRun({ text: questionText, size: 24, font: "Montserrat" })],
            spacing: { after: 200 },
            keepNext: true,
            keepLines: true,
        }),
    ];

    if (q.imageData) {
        try {
            const base64String = q.imageData;
            const imageBuffer = base64ToArrayBuffer(base64String);
            let imageType = (base64String.match(/data:image\/(.*?);base64,/) || [])[1] || 'png';
            if (imageType === 'jpeg') imageType = 'jpg';

            if (['png', 'jpg', 'gif', 'bmp'].includes(imageType)) {
                const dimensions = await getImageDimensions(base64String);
                const targetWidth = 400; 
                const aspectRatio = dimensions.height / dimensions.width;
                const targetHeight = Math.round(targetWidth * aspectRatio);

                 content.push(new Paragraph({
                    children: [new ImageRun({
                        data: imageBuffer,
                        transformation: { width: targetWidth, height: targetHeight },
                        type: imageType as "png" | "jpg" | "gif" | "bmp",
                    })],
                    alignment: AlignmentType.CENTER,
                    keepNext: true,
                }));
            }
        } catch (e) {
            console.error("Failed to process image for DOCX export:", e);
            content.push(new Paragraph({ children: [new TextRun({ text: "[Error: Image could not be embedded]", color: "ff0000", italics: true })] }));
        }
    }

    if (type === 'memo') {
         content.push(new Paragraph({
            children: [
                new TextRun({ text: "Answer: ", bold: true, color: "02A552", size: 22, font: "Montserrat" }),
                new TextRun({ text: answerText, color: "02A552", size: 22, font: "Montserrat" })
            ],
            spacing: { after: 600 },
        }));
    } else {
        content.push(new Paragraph({ text: "" })); 
        content.push(createRuledLine());
        content.push(createRuledLine());
        content.push(createRuledLine());
        content.push(new Paragraph({ text: "", spacing: { after: 600 } }));
    }

    return content;
};

const getPageBorderOptions = (): ISectionOptions["properties"] => ({
    page: {
        borders: {
            pageBorders: {
                display: PageBorderDisplay.ALL_PAGES,
                offsetFrom: PageBorderOffsetFrom.PAGE,
            },
            pageBorderTop: { style: BorderStyle.SINGLE, size: 8, color: "02A552" },
            pageBorderBottom: { style: BorderStyle.SINGLE, size: 8, color: "02A552" },
            pageBorderLeft: { style: BorderStyle.SINGLE, size: 8, color: "02A552" },
            pageBorderRight: { style: BorderStyle.SINGLE, size: 8, color: "02A552" },
        },
    },
});

// --- DOCX Export Functions ---

export const exportHomeworkAsDocx = async (homework: SavedHomework): Promise<void> => {
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const footerLogoBuffer = await getFooterLogoBuffer();
    
    const coverPage = await createCoverPage({
        name: homework.name,
        subject: homework.params.subject,
        grade: homework.params.grade,
        curriculum: homework.params.curriculum,
        testType: 'Homework',
    }, headerLogoBuffer);

    const footer = createFooter(footerLogoBuffer);

    const questionPromises = homework.questions.map((q, index) => createDocxQuestion(q, index, 'questions'));
    const questions = (await Promise.all(questionPromises)).flat();
    
    const memoPromises = homework.questions.map((q, index) => createDocxQuestion(q, index, 'memo'));
    const memo = (await Promise.all(memoPromises)).flat();

    const doc = new Document({
        sections: [{
            footers: { default: footer },
            children: [
                ...coverPage,
                new Paragraph({ children: [new TextRun({ text: `Instructions: ${homework.params.instructions}`, italics: true, size: 24, font: "Montserrat" })], spacing: { after: 400 } }),
                ...questions,
                new Paragraph({
                    children: [new TextRun({ text: 'Homework Memorandum', font: "Aquatico" })],
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    pageBreakBefore: true,
                }),
                ...memo
            ],
            properties: getPageBorderOptions(),
        }],
    });

    const buffer = await DocxPacker.toBlob(doc);
    saveAs(buffer, `${homework.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_homework.docx`);
};

export const exportTestAsDocx = async (test: SavedTest, type: 'questions' | 'memo'): Promise<void> => {
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const footerLogoBuffer = await getFooterLogoBuffer();

    const coverPage = await createCoverPage({
        name: test.name,
        subject: test.params.subject,
        grade: test.params.grade,
        curriculum: test.params.curriculum,
    }, headerLogoBuffer);
    
    const footer = createFooter(footerLogoBuffer);
    
    const questionPromises = test.questions.map((q, index) => createDocxQuestion(q, index, type));
    const docChildren = (await Promise.all(questionPromises)).flat();

    const doc = new Document({
        sections: [{
            footers: { default: footer },
            children: [
                ...coverPage,
                new Paragraph({ children: [new TextRun({ text: type === 'memo' ? 'Marking Memorandum' : 'Question Paper', bold: true, size: 32, font: "Aquatico" })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                ...docChildren,
            ],
            properties: getPageBorderOptions(),
        }],
    });
    
    const buffer = await DocxPacker.toBlob(doc);
    saveAs(buffer, `${test.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${type}.docx`);
}

// --- PPTX Export Function ---
export const exportPresentationAsPptx = async (presentation: Presentation): Promise<void> => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    const slides = await db.slides.where({ presentationId: presentation.id }).sortBy('slideNumber');

    // --- Title Slide ---
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const headerLogoBase64 = arrayBufferToBase64(headerLogoBuffer);
    const logoDimensions = await getImageDimensions(headerLogoBase64);
    
    const logoW = 3.0;
    const logoH = (logoW * logoDimensions.height) / logoDimensions.width;

    const titleSlide = pptx.addSlide();
    titleSlide.addImage({
        data: headerLogoBase64,
        x: (10 - logoW) / 2, y: 0.75, w: logoW, h: logoH,
    });
    titleSlide.addText(presentation.params.topic, { 
        x: 0.5, y: 2.5, w: 9, h: 1.2, 
        fontSize: 44, bold: true, align: 'center', color: '00154A', fontFace: 'Montserrat' 
    });
    const detailsText = [
        { text: `Subject: ${presentation.params.subject}`, options: { breakLine: true } },
        { text: `Grade: ${presentation.params.grade}`, options: { breakLine: true } },
        { text: `Curriculum: ${presentation.params.curriculum}` }
    ];
    titleSlide.addText(detailsText, {
        x: 0.5, y: 4.0, w: 9, h: 1.5,
        fontSize: 20, align: 'center', color: '333333', fontFace: 'Montserrat'
    });
    
    // --- Content Slides ---
    for (const slide of slides) {
        if (slide.isIntro) continue;

        const pptxSlide = pptx.addSlide();
        pptxSlide.addText(slide.title, { 
            x: 0.5, y: 0.25, w: 9, h: 0.75, 
            fontSize: 18, bold: true, color: '00154A', fontFace: 'Montserrat' 
        });
        
        const cleanContent = slide.content.replace(/\*\*/g, '');
        const lines = cleanContent.split('\n').filter(line => line.trim() !== '');
        
        const textObjects = lines.map(line => {
            if (line.trim().startsWith('⦁')) {
                return { text: line.trim().substring(1).trim(), options: { bullet: true } };
            }
            return { text: line.trim(), options: { breakLine: true } };
        });

        const textY = 1.25;
        const textH = 4.25;

        if (slide.imageData) {
            const imageW = 4.0;
            const imageH = 4.0;
            const imageX = 5.5;
            const imageY = 1.35;
            
            pptxSlide.addText(textObjects, { 
                x: 0.5, y: textY, w: 4.8, h: textH, 
                fontSize: 12, align: 'left', fontFace: 'Montserrat'
            });
            pptxSlide.addImage({ 
                data: slide.imageData, x: imageX, y: imageY, w: imageW, h: imageH, 
                sizing: { type: 'contain', w: imageW, h: imageH } 
            });
        } else {
            pptxSlide.addText(textObjects, { 
                x: 0.5, y: textY, w: 9.0, h: textH, 
                fontSize: 12, align: 'left', fontFace: 'Montserrat'
            });
        }
    }
    
    pptx.writeFile({ fileName: `${presentation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx` });
};

export const exportLessonAsDocx = async (lesson: LessonPlan): Promise<void> => {
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const footerLogoBuffer = await getFooterLogoBuffer();
    const footer = createFooter(footerLogoBuffer);

    const coverPage = await createCoverPage({
        name: lesson.name,
        subject: lesson.params.subject,
        grade: lesson.params.grade,
        curriculum: lesson.params.curriculum,
        testType: 'Lesson Plan',
        timeLimit: lesson.params.duration,
    }, headerLogoBuffer);
    
    // Process lesson content for DOCX
    const lessonContentParagraphs = lesson.content
        .split('\n')
        .map(line => new Paragraph({ 
            children: [new TextRun({ text: line, font: "Montserrat", size: 24 })],
            spacing: { after: 150 } 
        }));

    // Process assessment questions
    const assessmentHeader = new Paragraph({
        children: [new TextRun({ text: 'Assessment Questions', font: "Aquatico" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        pageBreakBefore: lesson.questions.length > 0
    });
    
    const questionPromises = lesson.questions.map((q, index) => createDocxQuestion(q, index, 'questions'));
    const questions = (await Promise.all(questionPromises)).flat();
    
    const memoPromises = lesson.questions.map((q, index) => createDocxQuestion(q, index, 'memo'));
    const memo = (await Promise.all(memoPromises)).flat();
    
    const doc = new Document({
        sections: [{
            footers: { default: footer },
            children: [
                ...coverPage,
                new Paragraph({ children: [new TextRun({ text: 'Lesson Plan', bold: true, size: 32, font: "Aquatico" })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                ...lessonContentParagraphs,
                ...(lesson.questions.length > 0 ? [assessmentHeader, ...questions] : []),
                ...(lesson.questions.length > 0 ? [
                     new Paragraph({
                        children: [new TextRun({ text: 'Assessment Memorandum', font: "Aquatico" })],
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        pageBreakBefore: true,
                    }),
                    ...memo
                ] : []),
            ],
            properties: getPageBorderOptions(),
        }],
    });
    
    const buffer = await DocxPacker.toBlob(doc);
    saveAs(buffer, `${lesson.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_lesson_plan.docx`);
};

export const exportFormalTestAsDocx = async (testName: string, questions: TrainingQuestion[], params: FormalTestParams, type: 'questions' | 'memo'): Promise<void> => {
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const footerLogoBuffer = await getFooterLogoBuffer();

    const coverPage = await createCoverPage({
        name: testName,
        subject: params.subject,
        grade: params.grade,
        curriculum: params.curriculum,
        totalMarks: params.totalMarks,
        timeLimit: params.timeLimit,
        testType: params.testType,
    }, headerLogoBuffer);

    const footer = createFooter(footerLogoBuffer);

    const questionPromises = questions.map((q, index) => createDocxQuestion(q, index, type));
    const docChildren = (await Promise.all(questionPromises)).flat();


    const doc = new Document({
        sections: [{
            footers: { default: footer },
            children: [
                ...coverPage,
                new Paragraph({ children: [new TextRun({ text: type === 'memo' ? 'Marking Memorandum' : 'Question Paper', bold: true, size: 32, font: "Aquatico" })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                ...docChildren,
            ],
            properties: getPageBorderOptions(),
        }],
    });

    const buffer = await DocxPacker.toBlob(doc);
    saveAs(buffer, `${testName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${type}.docx`);
};


export const exportParsedExamAsDocx = async (exam: ParsedExamData, examName: string, metadata: { curriculum: Curriculum; grade: string; subject: string; }): Promise<void> => {
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const footerLogoBuffer = await getFooterLogoBuffer();
    const footer = createFooter(footerLogoBuffer);

    const coverPage = await createCoverPage({
        name: examName,
        subject: metadata.subject,
        grade: metadata.grade,
        curriculum: metadata.curriculum
    }, headerLogoBuffer);

    const questionPromises = exam.questions.map((q, index) => createDocxQuestion(q, index, 'questions'));
    const docChildren = (await Promise.all(questionPromises)).flat();

    const doc = new Document({
        sections: [{
            footers: { default: footer },
            children: [
                ...coverPage,
                new Paragraph({ children: [new TextRun({ text: 'Question Paper', bold: true, size: 32, font: "Aquatico" })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                ...docChildren
            ],
            properties: getPageBorderOptions(),
        }],
    });
    
    const buffer = await DocxPacker.toBlob(doc);
    saveAs(buffer, `${examName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_questions.docx`);
};

export const exportParsedMemorandumAsDocx = async (exam: ParsedExamData, examName: string, metadata: { curriculum: Curriculum; grade: string; subject: string; }): Promise<void> => {
     const headerLogoBuffer = await getHeaderLogoBuffer();
     const footerLogoBuffer = await getFooterLogoBuffer();
     const footer = createFooter(footerLogoBuffer);
 
     const coverPage = await createCoverPage({
         name: examName,
         subject: metadata.subject,
         grade: metadata.grade,
         curriculum: metadata.curriculum
     }, headerLogoBuffer);
 
     const questionPromises = exam.questions.map((q, index) => createDocxQuestion(q, index, 'memo'));
     const docChildren = (await Promise.all(questionPromises)).flat();
 
     const doc = new Document({
         sections: [{
            footers: { default: footer },
             children: [
                ...coverPage,
                 new Paragraph({ children: [new TextRun({ text: 'Marking Memorandum', bold: true, size: 32, font: "Aquatico" })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                 ...docChildren
             ],
             properties: getPageBorderOptions(),
         }],
     });
    
    const buffer = await DocxPacker.toBlob(doc);
    saveAs(buffer, `${examName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_memorandum.docx`);
};

export const exportManualExamAsDocx = async (exam: ManualExam): Promise<void> => {
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const footerLogoBuffer = await getFooterLogoBuffer();
    const footer = createFooter(footerLogoBuffer);

    const coverPage = await createCoverPage({
        name: exam.name,
        subject: 'Manual Exam',
        grade: 'N/A',
        curriculum: 'N/A'
    }, headerLogoBuffer);

    const sectionsDocxPromises = exam.sections.map(async (section) => {
        const sectionTitle = new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 }, keepNext: true });
        
        const questionGroupsPromises = section.questions.map(async (group) => {
            const groupParas: Paragraph[] = [
                new Paragraph({
                    children: [new TextRun({ text: group.questionNumber, bold: true, size: 28 })],
                    spacing: { after: 100 },
                    keepNext: true,
                }),
            ];
            
            if (group.mainQuestionText) {
                groupParas.push(new Paragraph({
                    children: [new TextRun({ text: group.mainQuestionText, size: 24 })],
                    spacing: { after: 200 },
                    keepNext: true,
                    keepLines: true,
                }));
            }

            const subQuestionsPromises = group.subQuestions.map(async (sub) => {
                const subParas: Paragraph[] = [
                     new Paragraph({
                         children: [
                             new TextRun({ text: `${sub.questionNumber} `, size: 24 }),
                             new TextRun({ text: sub.text, size: 24 }),
                             new TextRun({ text: `\t${sub.marks}`, size: 24, bold: true }),
                         ],
                         indent: { left: convertInchesToTwip(0.5) },
                         spacing: { after: 150 },
                         keepNext: true,
                         keepLines: true,
                     })
                ];
                if (sub.imageData) {
                    try {
                        const base64String = sub.imageData;
                        const imageBuffer = base64ToArrayBuffer(base64String);
                        let imageType = (base64String.match(/data:image\/(.*?);base64,/) || [])[1] || 'png';
                        if (imageType === 'jpeg') imageType = 'jpg';

                        if (['png', 'jpg', 'gif', 'bmp'].includes(imageType)) {
                            const dimensions = await getImageDimensions(base64String);
                            const targetWidth = 300;
                            const aspectRatio = dimensions.height / dimensions.width;
                            const targetHeight = Math.round(targetWidth * aspectRatio);

                            subParas.push(new Paragraph({
                                children: [new ImageRun({
                                    data: imageBuffer,
                                    transformation: { width: targetWidth, height: targetHeight },
                                    type: imageType as "png" | "jpg" | "gif" | "bmp",
                                })],
                                alignment: AlignmentType.CENTER,
                                indent: { left: convertInchesToTwip(0.5) },
                            }));
                        }
                    } catch(e) {
                         console.error("Failed to process image for DOCX export:", e);
                         subParas.push(new Paragraph({ children: [new TextRun({ text: "[Error: Image could not be embedded]", color: "ff0000", italics: true })] }));
                    }
                }
                subParas.push(createRuledLine(), createRuledLine(), createRuledLine(), new Paragraph({ text: "", spacing: { after: 200 } }));
                return subParas;
            });
            const resolvedSubQuestions = (await Promise.all(subQuestionsPromises)).flat();
            return [...groupParas, ...resolvedSubQuestions];
        });
        
        const resolvedQuestionGroups = (await Promise.all(questionGroupsPromises)).flat();
        return [sectionTitle, ...resolvedQuestionGroups];
    });

    const sectionsDocx = (await Promise.all(sectionsDocxPromises)).flat();

    const doc = new Document({
        sections: [{
            footers: { default: footer },
            children: [
                ...coverPage,
                new Paragraph({ text: exam.name, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                ...sectionsDocx
            ],
            properties: getPageBorderOptions(),
        }]
    });
    
    const buffer = await DocxPacker.toBlob(doc);
    saveAs(buffer, `${exam.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_manual_exam.docx`);
};
