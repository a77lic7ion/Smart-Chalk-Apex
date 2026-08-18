
import { saveAs } from 'file-saver';
import PptxGenJS from 'pptxgenjs';
import { db } from '../db';
import type { SavedTest, Presentation, Slide, ImagePlaceholder, LessonPlan, FormalTestParams, TrainingQuestion, SavedHomework, ManualExam, ParsedExamData, ExamQuestion, Curriculum } from '../types';
import { Document, Paragraph, TextRun, ImageRun, Packer as DocxPacker, HeadingLevel, AlignmentType, convertInchesToTwip, Header, Footer, PageNumber, PageBorderDisplay, PageBorders, PageBorderOffsetFrom, BorderStyle, ISectionOptions, HeightRule } from 'docx';
import templateLogoMark from '@/SmartChalk-logo-mark.png';

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
        return await getLogoAsArrayBuffer(templateLogoMark);
    } catch (error) {
        console.error("Failed to fetch header logo for DOCX:", error);
        throw error;
    }
};

const getFooterLogoBuffer = async (): Promise<ArrayBuffer> => {
    try {
        return await getLogoAsArrayBuffer(templateLogoMark);
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
                        transformation: { height: 28, width: 31 },
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
    const targetWidth = 150;
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

const normaliseMemoLines = (answerText: string): string[] => {
    const cleaned = answerText
        .replace(/^\s*Answer:\s*/i, '')
        .replace(/\r\n/g, '\n')
        .trim();

    if (!cleaned) return ['No answer provided.'];

    return cleaned
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => line.replace(/^[-•]\s*/, ''));
};

const createMemoAnswerParagraphs = (answerText: string, marksText: string): Paragraph[] => {
    const lines = normaliseMemoLines(answerText);
    const paragraphs: Paragraph[] = [];
    let rubricMode = false;

    lines.forEach((line, lineIndex) => {
        const isRubricHeading = /^(beoordelingscriteria|marking criteria|rubric|memorandum notes?)\s*:?$/i.test(line);
        const isRubricItem = rubricMode && (/^[-•]/.test(line) || /:\s*\d+\s*(marks?|punt(e|e)?)?/i.test(line));

        if (isRubricHeading) {
            rubricMode = true;
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line.replace(/:$/, ''), bold: true, color: '111111', size: 21, font: 'Montserrat' })],
                spacing: { before: 180, after: 80 },
                keepNext: true,
            }));
            return;
        }

        const isSubAnswer = /^(vraag|question)\s+\d+/i.test(line);
        const prefixMatch = line.match(/^((?:Vraag|Question)\s+\d+(?:\.\d+)?)\s*:\s*(.*)$/i);
        const label = prefixMatch?.[1];
        const value = prefixMatch?.[2] ?? line;

        paragraphs.push(new Paragraph({
            children: label
                ? [
                    new TextRun({ text: `${label}: `, bold: true, color: '02A552', size: 21, font: 'Montserrat' }),
                    new TextRun({ text: value, color: '02A552', size: 21, font: 'Montserrat' }),
                ]
                : [
                    new TextRun({ text: isRubricItem ? '• ' : '', color: isRubricItem ? '555555' : '02A552', size: 21, font: 'Montserrat' }),
                    new TextRun({ text: line, color: isRubricItem ? '555555' : '02A552', size: 21, font: 'Montserrat' }),
                ],
            indent: isSubAnswer ? { left: 240 } : undefined,
            spacing: { after: 80 },
            keepLines: true,
        }));

        if (/^\(Totaal:|^\(Total:/i.test(line)) rubricMode = false;
        if (lineIndex === lines.length - 1 && marksText && !/\(\s*\d+\s*(marks?|punt(e|e)?)\s*\)/i.test(line)) {
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: `Marks available: ${marksText}`, bold: true, color: '111111', size: 20, font: 'Montserrat' })],
                spacing: { before: 120, after: 80 },
            }));
        }
    });

    return paragraphs;
};

const createDocxQuestion = async (q: TrainingQuestion | ExamQuestion, index: number, type: 'questions' | 'memo'): Promise<Paragraph[]> => {
    const questionNumberText = 'questionNumber' in q && q.questionNumber ? q.questionNumber : `Question ${index + 1}`;
    const questionText = 'text' in q ? q.text : q.question;
    const answerText = 'answer' in q ? q.answer : ('annexure' in q && q.annexure ? q.annexure.text : "No answer provided.");
    const marksText = 'marks' in q && q.marks ? q.marks : '';

    const content: Paragraph[] = [
        new Paragraph({
            children: [
                new TextRun({ text: questionNumberText, bold: true, size: 27, font: "Aquatico", color: '111111' }),
                ...(marksText ? [new TextRun({ text: `   ${marksText}`, size: 22, bold: true, font: "Montserrat", color: '555555' })] : []),
            ],
            spacing: { before: type === 'memo' ? 260 : 120, after: 120 },
            keepNext: true,
        }),
        new Paragraph({
            children: [new TextRun({ text: questionText, size: 23, font: "Montserrat", color: '111111' })],
            spacing: { after: type === 'memo' ? 180 : 200 },
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
            children: [new TextRun({ text: 'EXPECTED ANSWER', bold: true, color: '02A552', size: 20, font: 'Montserrat' })],
            spacing: { before: 80, after: 60 },
            keepNext: true,
        }));
        content.push(...createMemoAnswerParagraphs(answerText, marksText));
        content.push(new Paragraph({
            children: [new TextRun({ text: '____________________________________________________________', color: 'D9DDE5', size: 16, font: 'Montserrat' })],
            spacing: { before: 100, after: 220 },
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

export const exportHomeworkAsDocx = async (homework: SavedHomework, type: 'questions' | 'memo'): Promise<void> => {
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const footerLogoBuffer = await getFooterLogoBuffer();
    
    const coverPage = await createCoverPage({
        name: homework.name,
        subject: homework.params.subject,
        grade: homework.params.grade,
        curriculum: homework.params.curriculum,
        testType: type === 'memo' ? 'Homework Memorandum' : 'Homework',
    }, headerLogoBuffer);

    const footer = createFooter(footerLogoBuffer);

    const content = (await Promise.all(
        homework.questions.map((q, index) => createDocxQuestion(q, index, type))
    )).flat();

    const children = type === 'memo'
        ? [
            ...coverPage,
            new Paragraph({
                children: [new TextRun({ text: 'Homework Memorandum', font: "Aquatico" })],
                heading: HeadingLevel.HEADING_1,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            }),
            ...content,
        ]
        : [
            ...coverPage,
            new Paragraph({ children: [new TextRun({ text: `Instructions: ${homework.params.instructions}`, italics: true, size: 24, font: "Montserrat" })], spacing: { after: 400 } }),
            ...content,
        ];

    const doc = new Document({
        sections: [{
            footers: { default: footer },
            children,
            properties: getPageBorderOptions(),
        }],
    });

    const buffer = await DocxPacker.toBlob(doc);
    const suffix = type === 'memo' ? 'memorandum' : 'homework';
    saveAs(buffer, `${homework.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${suffix}.docx`);
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
}// --- PPTX Export Function ---
export const exportPresentationAsPptx = async (presentation: Presentation, slidesOverride?: Slide[]): Promise<void> => {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'SmartChalk';
    pptx.company = 'SmartChalk';
    pptx.subject = `${presentation.params.subject} — ${presentation.params.topic}`;
    pptx.title = presentation.name;
    pptx.lang = 'en-ZA';

    const sourceSlides = slidesOverride ?? await db.slides.where({ presentationId: presentation.id }).sortBy('slideNumber');
    const libraryImages = await db.imageLibrary.toArray();
    const slides = sourceSlides
        .map(slide => {
            if (slide.imageData) return slide;
            const libraryImage = libraryImages.find(image => image.slideId === slide.id && image.imageData);
            return libraryImage ? { ...slide, imageData: libraryImage.imageData } : slide;
        })
        .filter(slide => !slide.isIntro);
    const headerLogoBase64 = arrayBufferToBase64(await getHeaderLogoBuffer());
    const logoDimensions = await getImageDimensions(headerLogoBase64);
    const logoW = 1.15;
    const logoH = (logoW * logoDimensions.height) / logoDimensions.width;
    const W = 13.333;
    const H = 7.5;
    const C = { navy: '0B1736', blue: '173B72', yellow: 'F9C400', paper: 'F7F5EF', white: 'FFFFFF', ink: '111111', muted: '5C6675', line: 'D9DDE5' };

    const addBrandMark = (slide: PptxGenJS.Slide, color = C.navy) => {
        slide.addShape(pptx.ShapeType.line, { x: 0.55, y: 7.08, w: 12.2, h: 0, line: { color: C.line, width: 0.8 } });
        slide.addText('SMARTCHALK', { x: 0.58, y: 7.14, w: 1.3, h: 0.18, fontFace: 'Montserrat', fontSize: 6.5, bold: true, charSpacing: 1.5, color });
    };

    const addSectionTag = (slide: PptxGenJS.Slide, label: string, color = C.yellow) => {
        slide.addShape(pptx.ShapeType.rect, { x: 0.62, y: 0.42, w: 1.05, h: 0.24, rectRadius: 0.03, fill: { color }, line: { color, transparency: 100 } });
        slide.addText(label.toUpperCase(), { x: 1.82, y: 0.39, w: 2.8, h: 0.28, fontFace: 'Montserrat', fontSize: 8, bold: true, charSpacing: 1.2, color: C.muted, margin: 0 });
    };

    const addPageNumber = (slide: PptxGenJS.Slide, page: number) => {
        slide.addText(String(page).padStart(2, '0'), { x: 12.2, y: 7.12, w: 0.55, h: 0.2, fontFace: 'Montserrat', fontSize: 7, bold: true, color: C.muted, align: 'right', margin: 0 });
    };

    const addBodyText = (slide: PptxGenJS.Slide, content: string, x: number, y: number, w: number, h: number, color = C.ink, fontSize = 17) => {
        const lines = content.replace(/\*\*/g, '').split('\n').map(line => line.trim()).filter(Boolean);
        const objects = lines.map((line, index) => ({ text: line.startsWith('⦁') ? line.substring(1).trim() : line, options: { bullet: line.startsWith('⦁'), breakLine: index < lines.length - 1 } }));
        slide.addText(objects, { x, y, w, h, fontFace: 'Montserrat', fontSize, color, breakLine: false, valign: 'top', margin: 0.04, paraSpaceAfterPt: 10, fit: 'shrink' });
    };

    // Cover: intentionally sparse, with the logo and a strong full-screen brand field.
    const cover = pptx.addSlide();
    cover.background = { color: C.navy };
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { color: C.navy, transparency: 100 } });
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: H, fill: { color: C.yellow }, line: { color: C.yellow, transparency: 100 } });
    cover.addImage({ data: headerLogoBase64, x: 0.8, y: 0.72, w: logoW, h: logoH, transparency: 0 });
    cover.addText('SMARTCHALK GENERATOR', { x: 0.82, y: 2.05, w: 5.5, h: 0.3, fontFace: 'Montserrat', fontSize: 10, bold: true, charSpacing: 2.4, color: C.yellow, margin: 0 });
    cover.addText(presentation.params.topic, { x: 0.78, y: 2.55, w: 7.8, h: 1.55, fontFace: 'Calibri Light', fontSize: 36, bold: true, color: C.white, margin: 0, fit: 'shrink' });
    cover.addText(`${presentation.params.subject}  ·  ${presentation.params.grade}\n${presentation.params.curriculum}`, { x: 0.84, y: 4.55, w: 6.4, h: 0.75, fontFace: 'Montserrat', fontSize: 15, color: 'D8DFEC', breakLine: false, margin: 0, fit: 'shrink' });
    cover.addShape(pptx.ShapeType.line, { x: 0.84, y: 5.75, w: 2.1, h: 0, line: { color: C.yellow, width: 2.2 } });
    cover.addText('A clear lesson story, built for the classroom.', { x: 0.84, y: 5.95, w: 5.7, h: 0.35, fontFace: 'Montserrat', fontSize: 11, italic: true, color: 'AEBBD0', margin: 0 });

    // A short section divider gives the deck an intentional beginning before the content slides.
    const section = pptx.addSlide();
    section.background = { color: C.paper };
    section.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.paper }, line: { color: C.paper, transparency: 100 } });
    section.addShape(pptx.ShapeType.rect, { x: 0.75, y: 0.78, w: 0.16, h: 5.45, fill: { color: C.yellow }, line: { color: C.yellow, transparency: 100 } });
    section.addText('01', { x: 1.25, y: 1.0, w: 1.1, h: 0.55, fontFace: 'Calibri Light', fontSize: 28, bold: true, color: C.yellow, margin: 0 });
    section.addText('THE BIG IDEA', { x: 1.27, y: 2.0, w: 5.4, h: 0.35, fontFace: 'Montserrat', fontSize: 10, bold: true, charSpacing: 2, color: C.muted, margin: 0 });
    section.addText(presentation.params.topic, { x: 1.23, y: 2.48, w: 8.8, h: 1.4, fontFace: 'Calibri Light', fontSize: 32, bold: true, color: C.navy, margin: 0, fit: 'shrink' });
    section.addText('Core concepts and classroom-ready explanations', { x: 1.27, y: 4.45, w: 6.5, h: 0.4, fontFace: 'Montserrat', fontSize: 15, color: C.muted, margin: 0 });
    addBrandMark(section, C.navy);
    addPageNumber(section, 2);

    let page = 3;
    for (const slide of slides) {
        const contentSlide = pptx.addSlide();
        contentSlide.background = { color: C.paper };
        contentSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.paper }, line: { color: C.paper, transparency: 100 } });
        addSectionTag(contentSlide, slide.slideNumber <= 3 ? 'Explore' : 'Explain');
        contentSlide.addText(slide.title, { x: 0.62, y: 0.88, w: 8.6, h: 0.75, fontFace: 'Calibri Light', fontSize: 25, bold: true, color: C.navy, margin: 0, fit: 'shrink' });
        contentSlide.addShape(pptx.ShapeType.line, { x: 0.62, y: 1.78, w: 12.05, h: 0, line: { color: C.line, width: 0.8 } });

        if (slide.imageData) {
            // Presentation images are normalized to 1:1 before they reach the exporter.
            // Keep the PPTX image itself square and avoid PptxGenJS crop XML, which can
            // emit negative srcRect values for square-to-landscape crops in PowerPoint.
            contentSlide.addShape(pptx.ShapeType.roundRect, { x: 8.02, y: 2.14, w: 4.12, h: 4.12, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.line, width: 0.7 } });
            contentSlide.addImage({ data: slide.imageData, x: 8.16, y: 2.28, w: 3.84, h: 3.84 });
            addBodyText(contentSlide, slide.content, 0.72, 2.2, 6.25, 3.95, C.ink, 16);
        } else {
            contentSlide.addShape(pptx.ShapeType.roundRect, { x: 0.62, y: 2.12, w: 12.05, h: 4.22, rectRadius: 0.08, fill: { color: C.white }, line: { color: C.line, width: 0.7 } });
            addBodyText(contentSlide, slide.content, 0.95, 2.46, 11.35, 3.55, C.ink, 17);
        }
        addBrandMark(contentSlide, C.navy);
        addPageNumber(contentSlide, page++);
    }

    // Closing slide: minimal recap prompt, not another dense content page.
    const closing = pptx.addSlide();
    closing.background = { color: C.navy };
    closing.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: H, fill: { color: C.navy }, line: { color: C.navy, transparency: 100 } });
    closing.addImage({ data: headerLogoBase64, x: 0.8, y: 0.78, w: logoW, h: logoH });
    closing.addText('TAKEAWAY', { x: 0.84, y: 2.55, w: 3.2, h: 0.35, fontFace: 'Montserrat', fontSize: 10, bold: true, charSpacing: 2, color: C.yellow, margin: 0 });
    closing.addText('What should students remember?', { x: 0.8, y: 3.05, w: 8.5, h: 1.0, fontFace: 'Calibri Light', fontSize: 32, bold: true, color: C.white, margin: 0, fit: 'shrink' });
    closing.addText(`${presentation.params.topic}\n${presentation.params.subject}  ·  ${presentation.params.grade}`, { x: 0.84, y: 4.55, w: 6.5, h: 0.7, fontFace: 'Montserrat', fontSize: 14, color: 'D8DFEC', margin: 0 });
    closing.addShape(pptx.ShapeType.line, { x: 0.84, y: 5.82, w: 2.1, h: 0, line: { color: C.yellow, width: 2.2 } });

    await pptx.writeFile({ fileName: `${presentation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx` });
};

const resolveImageDataForDocx = async (imageData: string): Promise<string> => {
    if (imageData.startsWith('data:image/')) return imageData;

    const response = await fetch(imageData);
    if (!response.ok) throw new Error(`Failed to fetch lesson image: ${response.status}`);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to convert lesson image for DOCX export.'));
        reader.readAsDataURL(blob);
    });
};

const createLessonContentWithImages = async (content: string, imageMap: Map<string, string>): Promise<Paragraph[]> => {
    const paragraphs: Paragraph[] = [];
    const lines = content.split('\n');
    const placeholderRegex = /\[IMAGE_PLACEHOLDER:(.*?)\]/;

    for (const line of lines) {
        const match = line.match(placeholderRegex);
        if (match && match[1]) {
            const placeholderId = match[1];
            const imageData = imageMap.get(placeholderId);
            const textBefore = line.slice(0, match.index).trim();
            const textAfter = line.slice((match.index ?? 0) + match[0].length).trim();
            if (textBefore) paragraphs.push(new Paragraph({ children: [new TextRun({ text: textBefore, font: 'Montserrat', size: 24 })], spacing: { after: 150 } }));

            if (imageData) {
                try {
                    const embeddableImageData = await resolveImageDataForDocx(imageData);
                    const imageBuffer = base64ToArrayBuffer(embeddableImageData);
                    const dimensions = await getImageDimensions(embeddableImageData);
                    const targetWidth = 400;
                    const aspectRatio = dimensions.height / dimensions.width;
                    const targetHeight = Math.round(targetWidth * aspectRatio);
                    let imageType = (embeddableImageData.match(/data:image\/(.*?);base64,/) || [])[1] || 'png';
                    if (imageType === 'jpeg') imageType = 'jpg';

                    if (['png', 'jpg', 'gif', 'bmp'].includes(imageType)) {
                        paragraphs.push(new Paragraph({
                            children: [new ImageRun({
                                data: imageBuffer,
                                transformation: { width: targetWidth, height: targetHeight },
                                type: imageType as "png" | "jpg" | "gif" | "bmp",
                            })],
                            alignment: AlignmentType.CENTER,
                        }));
                    }
                } catch (e) {
                    console.error(`Failed to process image for placeholder ${placeholderId}:`, e);
                    paragraphs.push(new Paragraph({ children: [new TextRun({ text: `[Error: Image for ${placeholderId} could not be embedded]`, color: "ff0000", italics: true })] }));
                }
            } else {
                // Handle case where placeholder is found but no image data is available
                paragraphs.push(new Paragraph({ children: [new TextRun({ text: `[Image placeholder: ${placeholderId} - image not found]`, font: 'Montserrat', size: 24, italics: true, color: '888888' })] }));
            }
            if (textAfter) paragraphs.push(new Paragraph({ children: [new TextRun({ text: textAfter, font: 'Montserrat', size: 24 })], spacing: { after: 150 } }));
        } else {
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line, font: "Montserrat", size: 24 })],
                spacing: { after: 150 }
            }));
        }
    }

    return paragraphs;
};

export const exportLessonAsDocx = async (lesson: LessonPlan): Promise<void> => {
    const headerLogoBuffer = await getHeaderLogoBuffer();
    const footerLogoBuffer = await getFooterLogoBuffer();
    const footer = createFooter(footerLogoBuffer);
    const safeName = lesson.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const imagePlaceholders = await db.imagePlaceholders.where({ presentationId: lesson.id }).toArray();
    const imageMap = new Map<string, string>();
    for (const placeholder of imagePlaceholders) {
        if (placeholder.imageData) imageMap.set(placeholder.placeholderId, placeholder.imageData);
    }

    const coverPage = await createCoverPage({
        name: lesson.name,
        subject: lesson.params.subject,
        grade: lesson.params.grade,
        curriculum: lesson.params.curriculum,
        testType: 'Lesson Plan',
        timeLimit: lesson.params.duration,
    }, headerLogoBuffer);

    const lessonContentParagraphs = await createLessonContentWithImages(lesson.content, imageMap);
    const questionPromises = lesson.questions.map((q, index) => createDocxQuestion(q, index, 'questions'));
    const questions = (await Promise.all(questionPromises)).flat();
    const memoPromises = lesson.questions.map((q, index) => createDocxQuestion(q, index, 'memo'));
    const memo = (await Promise.all(memoPromises)).flat();

    const createLessonDocument = async (title: string, body: Paragraph[], fileSuffix: string): Promise<void> => {
        const doc = new Document({
            sections: [{
                footers: { default: footer },
                children: [
                    ...coverPage,
                    new Paragraph({
                        children: [new TextRun({ text: title, bold: true, size: 32, font: 'Aquatico' })],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 500 },
                        keepNext: true,
                    }),
                    ...(body.length > 0 ? body : [new Paragraph({
                        children: [new TextRun({ text: 'No content available.', font: 'Montserrat', size: 24, color: '666666' })],
                        alignment: AlignmentType.CENTER,
                    })]),
                ],
                properties: getPageBorderOptions(),
            }],
        });

        const buffer = await DocxPacker.toBlob(doc);
        saveAs(buffer, `${safeName}_${fileSuffix}.docx`);
    };

    // Each export is an independent DOCX. The cover page ends with a page break,
    // so the document title and content always begin on a clean page.
    await createLessonDocument('Lesson Plan', lessonContentParagraphs, 'lesson_plan');
    await createLessonDocument('Assessment Questions', questions, 'assessment_questions');
    await createLessonDocument('Assessment Memorandum', memo, 'assessment_memorandum');
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
