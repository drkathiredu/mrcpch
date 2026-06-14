import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

// Lazy initialize Gemini client to prevent startup crash if GEMINI_API_KEY is not defined
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined inside Settings > Secrets");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Request parsers
app.use(express.json());

// API health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
});

// Gemini Endpoint: Explain custom pediatric clinical scenario or question
app.post("/api/gemini/explain", async (req, res) => {
  try {
    const { question, options, correctAnswer, explanation } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question prompt is required." });
    }

    const ai = getGeminiClient();
    const optionsStr = Array.isArray(options) ? options.map((opt, i) => `Option ${String.fromCharCode(65 + i)}: ${opt}`).join("\n") : "";

    const prompt = `You are a Senior Pediatric Consultant and a highly regarded MRCPCH Examiner. A student has asked for an in-depth clinical explanation of the following question.

### CLINICAL SCENARIO & QUESTION:
${question}

${optionsStr ? `### MULTIPLE CHOICE OPTIONS:\n${optionsStr}` : ""}

${correctAnswer !== undefined ? `### CORRECT DESIGNATION: Option ${String.fromCharCode(65 + Number(correctAnswer))}` : ""}

${explanation ? `### BASAL CLINICAL EXPLANATION:\n${explanation}` : ""}

Please write a comprehensive, beautifully structured medical rationalization. Focus on:
1. **Clinical Core**: Why the correct answer is the gold-standard pathway or diagnostic selection.
2. **Differential Exclusions**: Why the other options are incorrect or represent distinct clinical states (with diagnostic differentials).
3. **High-Yield Clinical Pearls**: Give 2-3 concise clinical bullet points essential for the MRCPCH exams.

Use clean, readable Markdown syntax. Stand elegant and supportive as an expert pediatric educator.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("Gemini Explain Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the clinical tutor." });
  }
});

// Gemini Endpoint: Generate medical memory mnemonics
app.post("/api/gemini/mnemonic", async (req, res) => {
  try {
    const { topic, context } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required to formulate mnemonic." });
    }

    const ai = getGeminiClient();
    const prompt = `You are an expert Medical Educator specialized in pediatric clinical training. Build an elegant, memorable, and clever medical mnemonic to help pediatricians memorize key parameters, criteria, symptoms, or guidelines for:

### TOPIC/CONCEPT:
${topic}
${context ? `### ADDITIONAL CONTEXT:\n${context}` : ""}

Ensure the mnemonic:
1. Clearly states the mnemonic word/abbreviation in bold letters.
2. Maps each letter detailed to its corresponding medical term, clinical sign, or guideline step.
3. Provides a brief clinical rationale for each letter's significance in pediatric practice.

Use clean Markdown formatting. Keep it engaging, easy to retain under pressure, and highly accurate!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ mnemonic: response.text });
  } catch (error: any) {
    console.error("Gemini Mnemonic Error:", error);
    res.status(500).json({ error: error.message || "An error occurred generating mnemonic." });
  }
});

// Gemini Endpoint: Generate Structured AI Study Handout
app.post("/api/gemini/study-guide", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required to generate study handout." });
    }

    const ai = getGeminiClient();
    const prompt = `You are a senior Pediatric Director preparing candidates for the Royal College of Paediatrics and Child Health (MRCPCH) examinations. Create an exhaustive, peer-reviewed level, high-yield **MRCPCH Study Card & Examination Handout** for:

### SYLLABUS DISCIPLINE:
${topic}

Include the following sections clearly headed with clean Markdown formatting:
1. **Clinical Definition & Presentation**: A concise overview of how this pathology presents in neonates, infants, or children.
2. **First-Line vs. Gold-Standard Investigations**: Clearly distinguish what to do first vs. what is the definitive diagnostic criteria (such as imaging, genetics, or biosensors).
3. **Evidence-Based Management Plan**: Acute and chronic clinical stewardship, pharmacological lines, or surgical thresholds.
4. **Pediatric Memory Trick/Mnemonic**: Formulate or include a custom mnemonic to make this easy to remember during the exam.
5. **High-Yield Exam Pitfalls**: Important mistakes candidates make (e.g. confounding differentials, therapeutic contraindications).

Ensure high clarity, elegant styling, and top clinical academic fidelity.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ guide: response.text });
  } catch (error: any) {
    console.error("Gemini Study Guide Error:", error);
    res.status(500).json({ error: error.message || "An error occurred compiling study guide." });
  }
});

// Start routing and asset rendering
async function main() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode server mounting
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware mounted.");
  } else {
    // Production mode hosting
    const distPath = path.join(process.cwd(), "frontend/dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`Serving compiled static files from ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application successfully booted on host 0.0.0.0 port ${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failure starting fullstack Node.js server:", err);
});
