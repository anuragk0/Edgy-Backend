const flashCardFieldSpec = {
    
  question: { type: "string", required: true, description: "Question" },
  answer: {
    type: "string",
    required: true,
    description: "Answer of the question",
  },
  explanation: {
    type: "string",
    required: false,
    description: "Explanation of the answer",
  },
  ease: {
    type: "number",
    required: false,
    description: "Ease factor for spaced repetition (default 2.5)",
  },
  interval: {
    type: "number",
    required: false,
    description: "Interval for spaced repetition (default 1)",
  },
  lastReviewed: {
    type: "date",
    required: false,
    description: "Last reviewed date (default now)",
  },
};

module.exports = flashCardFieldSpec;
