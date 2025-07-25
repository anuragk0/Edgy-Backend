const GEMINI_KEY = process.env.GEMINI_KEY;
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const flashCardFieldSpec = require('../Schema/flashCardFieldSpec');

const geminiProperties = {};
for (const [key, spec] of Object.entries(flashCardFieldSpec)) {
  let type;
  switch (spec.type) {
    case 'string':
      type = SchemaType.STRING;
      break;
    case 'number':
      type = SchemaType.NUMBER;
      break;
    case 'date':
      type = SchemaType.STRING; 
      break;
    default:
      type = SchemaType.STRING;
  }
  geminiProperties[key] = {
    type,
    description: spec.description,
    nullable: !spec.required
  };
}

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const instructions = `You are an assistant that generates as many question and answer sets as possible from the provided text. Each set must include: ${Object.keys(flashCardFieldSpec).join(', ')}. 

Return your output as a valid JSON array only, with no extra text, comments, or explanations. Do not include any developer notes, instructions, or formatting guidance. Do not add any introductory or closing remarks. Only output the JSON array.

If the prompt is not about Q&A generation, respond only with: "I cannot help with this request."`;

const schema = {
  description: "Question and Answers",
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: geminiProperties,
    required: Object.entries(flashCardFieldSpec).filter(([k, v]) => v.required).map(([k]) => k),
  },
};

async function generateContent(rawText) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: instructions,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const prompt = `Generate as many question and answer pairs as possible from the following text, but do not generate more than 30 pairs. The questions should cover all important points, facts, and concepts in the text. Each set should include: ${Object.keys(flashCardFieldSpec).join(', ')}.\n\nText:\n${rawText}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  let content;
  let rawTextResponse = response.text();
  try {
    content = JSON.parse(rawTextResponse);
  } catch (e) {
    const match = rawTextResponse.match(/\[.*\]/s);
    if (match) {
      try {
        content = JSON.parse(match[0]);
      } catch (e2) {
        console.error("Failed to parse extracted JSON array from Gemini response:", match[0]);
        throw new Error("Failed to parse Gemini response as JSON (after extraction): " + match[0]);
      }
    } else {
      console.error("Raw Gemini response (not JSON):", rawTextResponse);
      throw new Error("Failed to parse Gemini response as JSON: " + rawTextResponse);
    }
  }
  return content; 
}

module.exports = { generateContent };

