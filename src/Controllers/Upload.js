const catchAsyncError = require("../../middleware/catchAsyncError");
const ErrorHandling = require("../../utils/ErrorHandling");
const FlashCard = require('../Model/FlashCard')
const pdfParse = require('pdf-parse');
const { generateContent } = require('../Service/generateFlashCard');
const { getPineconeIndex } = require('../Service/pineconeClient');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_KEY = process.env.GEMINI_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const Section = require('../Model/Section');
const { v4: uuidv4 } = require('uuid');
const uploadId = uuidv4(); 

const generateFlashCards = catchAsyncError(async (req, res, next) => {
    console.log(0);

    if (!req.file) {
        return next(new ErrorHandling(400, "No file uploaded"));
    }
    const { sectionId } = req.body;
    const pdfBuffer = req.file.buffer;
    const parsed = await pdfParse(pdfBuffer);
    const rawText = parsed.text;


    const maxChunkLength = 3000; 
    const paragraphs = rawText.split('\n').filter(p => p.trim().length > 0);
    let batchChunks = [];
    let batchChunk = '';
    for (const para of paragraphs) {
        if ((batchChunk + '\n' + para).length > maxChunkLength) {
            batchChunks.push(batchChunk);
            batchChunk = para;
        } else {
            batchChunk += (batchChunk ? '\n' : '') + para;
        }
    }
    if (batchChunk.trim()) batchChunks.push(batchChunk);

    let qaPairs = [];
    for (const chunk of batchChunks) {
        try {
            const pairs = await generateContent(chunk);
            if (Array.isArray(pairs)) {
                qaPairs = qaPairs.concat(pairs);
            }
        } catch (e) {
            console.error('Error generating content for chunk:', e);
        }
    }
    if (!qaPairs.length) {
        return next(new ErrorHandling(500, 'Failed to generate Q&A pairs'));
    }
 
    let flashcards = await FlashCard.insertMany(
        qaPairs.map((qa) => ({
            sectionId,
            question: qa.question,
            answer: qa.answer,
            explanation: qa.explanation || "",
            ease: qa.ease,
            interval: qa.interval,
            lastReviewed: qa.lastReviewed
                ? new Date(
                    typeof qa.lastReviewed === "string"
                      ? qa.lastReviewed.replace(/\[UTC\]$/, "")
                      : qa.lastReviewed
                  )
                : undefined
        }))
    );
    if (!flashcards) {
        return next(new ErrorHandling(500, 'Failed to save flashcards'));
    }

    if (sectionId && req.file && req.file.originalname) {
        await Section.findByIdAndUpdate(
            sectionId,
            { $addToSet: { files: req.file.originalname } },
            { new: true }
        );
    }

    const pineconeIndex = getPineconeIndex();
    const chunkSize = 1000; 
    let chunks = [];
    let currentChunk = '';
    for (const para of paragraphs) {
      if ((currentChunk + para).length > chunkSize) {
        chunks.push(currentChunk);
        currentChunk = para;
      } else {
        currentChunk += ' ' + para;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

 
    const records = chunks.map((chunk, i) => ({
        "_id": `${sectionId}-upload-${uploadId}-chunk-${i}`,
        "text": chunk
      }));
      console.log(records);

    const namespace = pineconeIndex.namespace(`${sectionId}`);
    console.log(namespace);

    // Pinecone upsert batch size limit 
    const BATCH_SIZE = 95;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        await namespace.upsertRecords(batch);
    }


    let sectionFiles = [];
    if (sectionId) {
        const section = await Section.findById(sectionId);
        sectionFiles = section?.files || [];
    }
    res.status(200).json({
        message: 'Q&A pairs generated, flashcards saved, and upserted to Pinecone',
        flashcards,
        pineconeUpserted: records.length,
        files: sectionFiles
    });
})

const answerQuestion = catchAsyncError(async (req, res, next) => {
    const {question, topK = 5, sectionId} = req.body;
    if (!question) {
        return next(new ErrorHandling(400, 'Question is required'));
    }
    if (!sectionId) {
        return next(new ErrorHandling(400, 'sectionId is required'));
    }
    const pineconeIndex = getPineconeIndex();
    const namespace = pineconeIndex.namespace(`${sectionId}`)

    const response = await namespace.searchRecords({
        query: {
            inputs: { text: question },
            topK
        },
        fields: ['text'],
    });

    const matches = response.result?.hits || [];
    const context = matches.map(m => m.fields?.text || m.text || "").join("\n\n");

    if (!matches.length || !context.trim() || context.trim().length < 20) {
        return res.status(200).json({
            answer: 'Please ask from uploaded content',
            message: 'Please ask from uploaded content'
        });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = `Given the following context, answer the question as accurately as possible.\n\nContext:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
    try {
        const result = await model.generateContent(prompt);
        if (!result) {
            return next(new ErrorHandling(500, 'Failed to generate answer with Gemini'));
        }
        let geminiAnswer = result.response.text();
        res.status(200).json({
            answer: geminiAnswer,
            message: 'Answer generated using Gemini and Pinecone context'
        });
    } catch (err) {
        // Check for Gemini API rate limit error
        if (err.status === 429) {
            return res.status(429).json({
                answer: null,
                message: 'The AI service is currently busy (rate limit exceeded). Please try again in a minute.'
            });
        }
 
        return next(new ErrorHandling(500, 'Failed to generate answer with Gemini'));
    }
});

module.exports = {generateFlashCards, answerQuestion}