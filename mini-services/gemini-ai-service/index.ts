// ============================================================
// Gemini AI Integration Service for VoiceAI SaaS Platform
// Port: 3032
// ============================================================

const PORT = 3032;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBjHJoJa2u0qkH0GoA3Ji0BEnHkdUA1GS8";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const PRIMARY_MODEL = "gemini-2.0-flash";
const FALLBACK_MODEL = "gemini-2.0-flash-lite";
const DEMO_MODE = process.env.GEMINI_DEMO_MODE !== "false"; // Enabled by default for sandbox compatibility

// ============================================================
// TypeScript Types
// ============================================================

interface ChatRequest {
  message: string;
  clinicContext?: ClinicContext;
  conversationHistory?: ConversationMessage[];
}

interface ClinicContext {
  clinicName?: string;
  doctorName?: string;
  services?: string[];
  fee?: string;
  hours?: string;
  language?: string;
}

interface ConversationMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface TranscribeRequest {
  audioBase64?: string;
  language?: string;
}

interface SentimentRequest {
  text: string;
}

interface SentimentResponse {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  keywords: string[];
}

interface SummaryRequest {
  transcript: string;
  clinicName?: string;
}

interface SummaryResponse {
  summary: string;
  intent: string;
  tags: string[];
  bookingDetails?: {
    patientName?: string;
    date?: string;
    time?: string;
    service?: string;
  };
}

interface GeminiContentPart {
  text: string;
}

interface GeminiContent {
  role: string;
  parts: GeminiContentPart[];
}

interface GeminiRequestBody {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: GeminiContentPart[];
  };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// ============================================================
// VoiceAI System Prompt Builder
// ============================================================

function buildSystemPrompt(context?: ClinicContext): string {
  const clinicName = context?.clinicName || "VoiceAI Healthcare";
  const doctorName = context?.doctorName || "our doctor";
  const language = context?.language || "Hinglish";
  const services = context?.services?.length
    ? context.services.join(", ")
    : "General Consultation, Dental Care, Health Checkup";
  const fee = context?.fee || "₹500";
  const hours = context?.hours || "Mon-Sat, 9:00 AM - 8:00 PM";

  return `You are VoiceAI, an AI receptionist for ${clinicName}. You speak in ${language}.
Your role is to:
1. Greet patients warmly
2. Help book, reschedule, or cancel appointments
3. Answer common questions about services, fees, and timing
4. Transfer to a human if the patient is upset or needs complex help
5. Always be polite, professional, and empathetic

Available services: ${services}
Doctor: ${doctorName}
Consultation fee: ${fee}
Business hours: ${hours}

Important guidelines:
- Always respond in ${language} unless the patient explicitly switches language
- Keep responses concise but helpful (max 2-3 sentences for most replies)
- If a patient wants to book, ask for their preferred date and time
- If a patient is angry or frustrated, apologize sincerely and offer to transfer to a human
- Never make up medical advice — suggest consulting the doctor
- For emergencies, advise the patient to visit the nearest hospital immediately`;
}

// ============================================================
// Gemini API Client
// ============================================================

async function callGeminiAPI(
  contents: GeminiContent[],
  systemPrompt?: string,
  temperature: number = 0.7,
  responseMimeType?: string
): Promise<GeminiResponse> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];

  for (const model of models) {
    const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const body: GeminiRequestBody = {
      contents,
      generationConfig: {
        temperature,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    if (responseMimeType) {
      body.generationConfig!.responseMimeType = responseMimeType;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `⚠️ Gemini API error (${model}): ${response.status}`,
          JSON.stringify(errorData).slice(0, 200)
        );
        continue; // Try fallback model
      }

      const data: GeminiResponse = await response.json();

      if (data.error) {
        console.error(
          `⚠️ Gemini API error (${model}):`,
          data.error.message
        );
        continue;
      }

      return data;
    } catch (err) {
      console.error(
        `⚠️ Gemini API fetch error (${model}):`,
        err instanceof Error ? err.message : String(err)
      );
      continue;
    }
  }

  // All models failed
  return {
    error: {
      code: 503,
      message: "All Gemini models failed to respond. Please try again later.",
      status: "UNAVAILABLE",
    },
  };
}

function extractTextFromResponse(response: GeminiResponse): string {
  if (response.error) {
    throw new Error(response.error.message);
  }

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No response text generated by Gemini AI");
  }

  return text.trim();
}

// ============================================================
// Demo Mode — Intelligent mock responses when Gemini API is unavailable
// ============================================================

function isBookingRelated(text: string): boolean {
  const keywords = ["book", "appointment", "schedule", "reserv", "slot", "time", "date", "karna", "book"];
  return keywords.some((k) => text.toLowerCase().includes(k));
}

function isGreeting(text: string): boolean {
  const keywords = ["hello", "hi", "hey", "namaste", "good morning", "good afternoon", "good evening", "hlo", "namaskar"];
  const t = text.toLowerCase().trim();
  return keywords.some((k) => t === k || t.startsWith(k));
}

function isFeeRelated(text: string): boolean {
  const keywords = ["fee", "cost", "charge", "price", "payment", "paisa", "paise", "rupee", "kitna", "amount"];
  return keywords.some((k) => text.toLowerCase().includes(k));
}

function isUpset(text: string): boolean {
  const keywords = ["angry", "frustrated", "terrible", "worst", "complaint", "rude", "useless", "bad", "awful", "kharab", "gussa"];
  return keywords.some((k) => text.toLowerCase().includes(k));
}

function isEmergency(text: string): boolean {
  const keywords = ["emergency", "urgent", "pain", "bleeding", "chest", "breathing", "unconscious", "accident", "emergency"];
  return keywords.some((k) => text.toLowerCase().includes(k));
}

function generateDemoChatResponse(message: string, clinicContext?: ClinicContext): string {
  const clinicName = clinicContext?.clinicName || "our clinic";
  const doctorName = clinicContext?.doctorName || "our doctor";
  const fee = clinicContext?.fee || "₹500";
  const hours = clinicContext?.hours || "Mon-Sat, 9:00 AM - 8:00 PM";
  const language = clinicContext?.language || "Hinglish";
  const services = clinicContext?.services?.length
    ? clinicContext.services.slice(0, 3).join(", ")
    : "General Consultation, Dental Care, Health Checkup";

  const msg = message.toLowerCase();

  if (isGreeting(msg)) {
    return `Namaste! ${clinicName} mein aapka swagat hai! 🙏 Main VoiceAI hoon, aapki AI receptionist. Kaise madad kar sakti hoon aapki? Aap appointment book karna chahte hain ya koi aur sawal hai?`;
  }

  if (isEmergency(msg)) {
    return `⚠️ Yeh ek emergency lag rahi hai! Please turant apne nearest hospital ya emergency ward mein jayen. Agar aapko ${doctorName} ki zarurat hai toh main unko urgent message bhej sakti hoon. Kya aap apna naam aur number bata sakte hain?`;
  }

  if (isUpset(msg)) {
    return `Main bahut sorry hoon ki aapko aisa experience hua. 🙏 Aapki feedback hum ke liye bahut important hai. Main abhi ${doctorName} se baat karake aapki problem solve karne ki koshish karti hoon. Kya main aapka naam aur number le sakti hoon taaki woh aapko call back kar sakein?`;
  }

  if (isFeeRelated(msg)) {
    return `${clinicName} mein consultation fee ${fee} hai. Ye fee ${doctorName} ke saath general checkup ke liye hai. Koi specific treatment ke liye fee alag ho sakti hai. Kya aap appointment book karna chahte hain? Mujhe aapka preferred date aur time bata dein.`;
  }

  if (isBookingRelated(msg)) {
    return `Bilkul! ${clinicName} mein appointment book karna bahut aasan hai. ✅ ${doctorName} ke liye slots available hain. Humari services include: ${services}. Kya aap bata sakte hain ki aap kaunsi service ke liye appointment chahte hain, aur aapko kaunsa date aur time suit karega? Humari timing ${hours} hai.`;
  }

  if (msg.includes("cancel") || msg.includes("reschedule")) {
    return `Ji haan, main aapki appointment cancel ya reschedule kar sakti hoon. 📅 Aapko apna appointment details bata dena hoga — kya aapka naam aur appointment date bata sakte hain? Main turant check karke aapko update deti hoon.`;
  }

  if (msg.includes("timing") || msg.includes("hours") || msg.includes("time") || msg.includes("samay")) {
    return `${clinicName} ki business hours ${hours} hain. Sunday ko clinic band rehti hai. ${doctorName} generally subah 9 baje se shaam 8 baje tak available rehte hain. Kya aap koi specific time pe appointment book karna chahte hain?`;
  }

  if (msg.includes("doctor") || msg.includes("dr") || msg.includes("doctor sahab")) {
    return `Haan ji! ${doctorName} humare senior consultant hain. Wo bahut experienced hain aur patients ko achhi care dete hain. Aap unke saath appointment book karna chahte hain? Mujhe preferred date aur time bata dein, main check karke confirm karti hoon.`;
  }

  if (msg.includes("thank") || msg.includes("shukriya") || msg.includes("dhanyavaad")) {
    return `Aapka dhanyavaad! 🙏 ${clinicName} se judne ke liye shukriya. Agar aapko aur koi madad chahiye toh please humse contact karein. Aapka din shubh ho! 😊`;
  }

  if (msg.includes("bye") || msg.includes("goodbye") || msg.includes("alvida")) {
    return `Alvida! ${clinicName} se judne ke liye dhanyavaad. 😊 Agar aapko kabhi medical help chahiye toh hum yahan hain. Aapka din shubh ho! 🙏`;
  }

  // Default response
  return `Ji haan, main samajh gayi. ${clinicName} mein aapki help ke liye main yahan hoon. Aap appointment book karna chahte hain, fees jaanna chahte hain, ya koi aur sawal hai? Mujhe bataiye, main aapki madad karungi! 😊`;
}

function generateDemoTranscription(): string {
  const samples = [
    "Hello... mujhe appointment book karni hai... Dr. Sharma ke saath... kal ho sakta hai kya?",
    "Haan ji... main Priya bol rahi hoon... mera toothache bahut ho raha hai... kya aaj slot available hai?",
    "Namaste... main pichle hafte se wait kar raha hoon... mera report aaya hai... doctor se milna hai...",
    "Hello... fee kitna hai... consultation ke liye... aur kya insurance accept karte hain aap?",
    "Main reschedule karna chahta tha... mera appointment tha 15 ko... ab 18 ko ho sakta hai?",
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

function generateDemoSentiment(text: string): SentimentResponse {
  const msg = text.toLowerCase();

  if (isUpset(msg)) {
    return {
      sentiment: "negative",
      confidence: 0.85 + Math.random() * 0.1,
      keywords: extractKeywords(text).concat(["complaint", "dissatisfied"]),
    };
  }

  if (isBookingRelated(msg) || isGreeting(msg)) {
    return {
      sentiment: "positive",
      confidence: 0.75 + Math.random() * 0.15,
      keywords: extractKeywords(text).concat(["appointment", "scheduling"]),
    };
  }

  if (isFeeRelated(msg)) {
    return {
      sentiment: "neutral",
      confidence: 0.7 + Math.random() * 0.2,
      keywords: extractKeywords(text).concat(["inquiry", "pricing"]),
    };
  }

  return {
    sentiment: "neutral",
    confidence: 0.6 + Math.random() * 0.3,
    keywords: extractKeywords(text),
  };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "because", "but", "and", "or", "if", "while", "about", "up", "it", "its", "i", "me", "my", "we", "our", "you", "your", "he", "she", "they", "them", "this", "that", "what", "which", "who", "mujhe", "hai", "hain", "karna", "ka", "ki", "ke", "ko", "se", "mein", "par", "aur", "ya", "nahi", "haan", "ji"]);
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);
}

function generateDemoSummary(transcript: string, clinicName?: string): SummaryResponse {
  const msg = transcript.toLowerCase();
  const clinic = clinicName || "the clinic";

  if (isBookingRelated(msg)) {
    return {
      summary: `Patient called ${clinic} to book an appointment. The call was handled successfully by VoiceAI. The patient was guided through the booking process and provided their preferred date and time.`,
      intent: "Appointment Booking",
      tags: ["new-booking", "appointment", "scheduling", "ai-handled"],
      bookingDetails: {
        patientName: null,
        date: null,
        time: null,
        service: null,
      },
    };
  }

  if (msg.includes("cancel")) {
    return {
      summary: `Patient called ${clinic} to cancel or modify an existing appointment. VoiceAI assisted with the cancellation process and offered to reschedule for a more convenient time.`,
      intent: "Cancellation",
      tags: ["cancellation", "reschedule", "modification"],
    };
  }

  if (isFeeRelated(msg)) {
    return {
      summary: `Patient inquired about consultation fees and payment options at ${clinic}. VoiceAI provided detailed pricing information and explained available payment methods.`,
      intent: "Fee Inquiry",
      tags: ["fee-inquiry", "pricing", "payment"],
    };
  }

  if (isUpset(msg)) {
    return {
      summary: `Patient expressed dissatisfaction during the call to ${clinic}. VoiceAI apologized and offered to escalate the issue to a human agent. The patient's concerns were noted for follow-up.`,
      intent: "General Inquiry",
      tags: ["escalation", "complaint", "follow-up-required"],
    };
  }

  return {
    summary: `Patient called ${clinic} with a general inquiry. VoiceAI provided relevant information about services, timing, and doctor availability. The call concluded positively.`,
    intent: "General Inquiry",
    tags: ["inquiry", "information", "ai-handled"],
  };
}

// ============================================================
// HTTP Server Helper
// ============================================================

function jsonResponse(data: unknown, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function parseBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

// ============================================================
// Route Handlers
// ============================================================

async function handleHealthCheck(): Promise<Response> {
  return jsonResponse({
    status: "healthy",
    service: "Gemini AI Integration Service",
    version: "1.0.0",
    port: PORT,
    demoMode: DEMO_MODE,
    primaryModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET / - Health check + model info",
      "POST /api/chat - Send message to Gemini AI",
      "POST /api/transcribe - Process audio transcription",
      "POST /api/analyze-sentiment - Analyze text sentiment",
      "POST /api/generate-summary - Generate call summary",
      "GET /api/models - List available models",
    ],
  });
}

async function handleChat(request: Request): Promise<Response> {
  try {
    const body = await parseBody<ChatRequest>(request);

    if (!body.message || typeof body.message !== "string") {
      return jsonResponse(
        { error: "Missing required field: message (string)" },
        400
      );
    }

    if (body.message.length > 10000) {
      return jsonResponse(
        { error: "Message too long. Maximum 10,000 characters." },
        400
      );
    }

    // Demo mode — return intelligent mock responses
    if (DEMO_MODE) {
      const demoResponse = generateDemoChatResponse(body.message, body.clinicContext);
      return jsonResponse({
        success: true,
        response: demoResponse,
        model: "demo",
        demoMode: true,
        timestamp: new Date().toISOString(),
      });
    }

    const systemPrompt = buildSystemPrompt(body.clinicContext);

    // Build conversation contents
    const contents: GeminiContent[] = [];

    // Add conversation history if provided
    if (body.conversationHistory && body.conversationHistory.length > 0) {
      for (const msg of body.conversationHistory) {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.parts[0]?.text || "" }],
        });
      }
    }

    // Add current message
    contents.push({
      role: "user",
      parts: [{ text: body.message }],
    });

    const response = await callGeminiAPI(contents, systemPrompt, 0.7);
    const text = extractTextFromResponse(response);

    return jsonResponse({
      success: true,
      response: text,
      model: response.candidates?.[0] ? PRIMARY_MODEL : FALLBACK_MODEL,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("❌ Chat error:", message);
    return jsonResponse({ error: message }, 500);
  }
}

async function handleTranscribe(request: Request): Promise<Response> {
  try {
    const body = await parseBody<TranscribeRequest>(request);
    const language = body.language || "hi-IN";

    // Demo mode — return simulated transcription
    if (DEMO_MODE) {
      const transcription = generateDemoTranscription();
      const simulationNote = body.audioBase64
        ? "Audio data received. Processing simulated transcription (demo mode)."
        : "No audio data provided. Returning sample transcription (demo mode).";
      return jsonResponse({
        success: true,
        transcription,
        language,
        confidence: 0.92,
        duration: "0:00",
        demoMode: true,
        note: simulationNote,
        timestamp: new Date().toISOString(),
      });
    }

    // Text-based simulation for audio transcription
    // In production, this would use Gemini's audio capabilities
    const simulationNote =
      body.audioBase64
        ? "Audio data received. Processing simulated transcription."
        : "No audio data provided. Returning sample transcription.";

    // Use Gemini to generate a sample Hinglish transcription response
    const prompt = `You are simulating an audio transcription service. The audio is in ${language} (Hinglish/Indian English).
${body.audioBase64 ? "The caller is speaking to a clinic receptionist." : "Generate a sample patient inquiry in Hinglish."}

Generate ONLY the transcribed text as a patient speaking to a clinic. Include natural speech patterns, pauses indicated by "...", and keep it to 1-3 sentences. Do not add any labels, prefixes, or explanations — just the transcribed text.`;

    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    const response = await callGeminiAPI(contents, undefined, 0.3);
    const transcription = extractTextFromResponse(response);

    return jsonResponse({
      success: true,
      transcription,
      language,
      confidence: 0.92,
      duration: "0:00", // Would be calculated from audio in production
      note: simulationNote,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("❌ Transcription error:", message);
    return jsonResponse({ error: message }, 500);
  }
}

async function handleAnalyzeSentiment(request: Request): Promise<Response> {
  try {
    const body = await parseBody<SentimentRequest>(request);

    if (!body.text || typeof body.text !== "string") {
      return jsonResponse(
        { error: "Missing required field: text (string)" },
        400
      );
    }

    if (body.text.length > 5000) {
      return jsonResponse(
        { error: "Text too long. Maximum 5,000 characters." },
        400
      );
    }

    const prompt = `Analyze the sentiment of the following text from a patient calling a healthcare clinic.

Text: "${body.text}"

Respond in this EXACT JSON format only, no other text:
{
  "sentiment": "positive" or "negative" or "neutral",
  "confidence": <number between 0 and 1>,
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"]
}

Rules:
- "positive" if the patient is happy, grateful, satisfied, or booking an appointment willingly
- "negative" if the patient is angry, frustrated, complaining, or upset
- "neutral" for general inquiries, scheduling questions, or informational requests
- Include 3-5 relevant keywords from the text
- Confidence should reflect how certain you are of the sentiment classification`;

    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    // Demo mode — return intelligent mock sentiment
    if (DEMO_MODE) {
      const sentimentData = generateDemoSentiment(body.text);
      return jsonResponse({
        success: true,
        ...sentimentData,
        demoMode: true,
        timestamp: new Date().toISOString(),
      });
    }

    const response = await callGeminiAPI(
      contents,
      undefined,
      0.1,
      "application/json"
    );

    const rawText = extractTextFromResponse(response);

    // Parse the JSON response from Gemini
    let sentimentData: SentimentResponse;
    try {
      // Clean up the response - sometimes Gemini adds markdown code blocks
      const cleanText = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      sentimentData = JSON.parse(cleanText);
    } catch {
      // Fallback parsing if Gemini doesn't return valid JSON
      sentimentData = {
        sentiment: "neutral",
        confidence: 0.5,
        keywords: [],
      };
    }

    // Validate and sanitize the response
    const validSentiments = ["positive", "negative", "neutral"];
    if (!validSentiments.includes(sentimentData.sentiment)) {
      sentimentData.sentiment = "neutral";
    }

    sentimentData.confidence = Math.min(
      1,
      Math.max(0, Number(sentimentData.confidence) || 0.5)
    );

    if (!Array.isArray(sentimentData.keywords)) {
      sentimentData.keywords = [];
    }

    return jsonResponse({
      success: true,
      ...sentimentData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("❌ Sentiment analysis error:", message);
    return jsonResponse({ error: message }, 500);
  }
}

async function handleGenerateSummary(request: Request): Promise<Response> {
  try {
    const body = await parseBody<SummaryRequest>(request);

    if (!body.transcript || typeof body.transcript !== "string") {
      return jsonResponse(
        { error: "Missing required field: transcript (string)" },
        400
      );
    }

    if (body.transcript.length > 20000) {
      return jsonResponse(
        { error: "Transcript too long. Maximum 20,000 characters." },
        400
      );
    }

    const clinicContext = body.clinicName
      ? `The call was to a clinic named "${body.clinicName}".`
      : "";

    const prompt = `You are an AI call analysis assistant for VoiceAI, a healthcare receptionist platform. ${clinicContext}

Analyze the following call transcript between a patient and an AI receptionist:

---
${body.transcript}
---

Provide a comprehensive analysis in this EXACT JSON format only, no other text:
{
  "summary": "<2-3 sentence summary of the call>",
  "intent": "<one of: Appointment Booking, General Inquiry, Rescheduling, Fee Inquiry, Emergency, Follow-up, Cancellation, Lab Report, Insurance, Other>",
  "tags": ["<tag1>", "<tag2>", "<tag3>", "<tag4>"],
  "bookingDetails": {
    "patientName": "<patient name if mentioned, or null>",
    "date": "<proposed date if mentioned, or null>",
    "time": "<proposed time if mentioned, or null>",
    "service": "<requested service if mentioned, or null>"
  }
}

Rules:
- Summary should be concise but informative
- Intent should be the PRIMARY purpose of the call
- Tags should include relevant categories (e.g., "new-patient", "follow-up", "urgent", "fee-related")
- bookingDetails should only be populated if appointment booking was discussed
- Use null for any booking detail that wasn't mentioned
- Extract exact values from the transcript where possible`;

    const contents: GeminiContent[] = [
      { role: "user", parts: [{ text: prompt }] },
    ];

    // Demo mode — return intelligent mock summary
    if (DEMO_MODE) {
      const summaryData = generateDemoSummary(body.transcript, body.clinicName);
      return jsonResponse({
        success: true,
        ...summaryData,
        demoMode: true,
        timestamp: new Date().toISOString(),
      });
    }

    const response = await callGeminiAPI(
      contents,
      undefined,
      0.2,
      "application/json"
    );

    const rawText = extractTextFromResponse(response);

    let summaryData: SummaryResponse;
    try {
      const cleanText = rawText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      summaryData = JSON.parse(cleanText);
    } catch {
      // Fallback
      summaryData = {
        summary: "Unable to generate summary from transcript.",
        intent: "Other",
        tags: ["unprocessed"],
        bookingDetails: undefined,
      };
    }

    // Validate
    if (!summaryData.summary) summaryData.summary = "No summary generated.";
    if (!summaryData.intent) summaryData.intent = "Other";
    if (!Array.isArray(summaryData.tags)) summaryData.tags = [];

    return jsonResponse({
      success: true,
      ...summaryData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("❌ Summary generation error:", message);
    return jsonResponse({ error: message }, 500);
  }
}

async function handleListModels(): Promise<Response> {
  try {
    const url = `${GEMINI_BASE_URL}/models?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return jsonResponse(
        {
          error: `Failed to fetch models: ${response.status}`,
          models: [
            {
              name: PRIMARY_MODEL,
              status: "available",
              recommended: true,
            },
            {
              name: FALLBACK_MODEL,
              status: "available",
              recommended: false,
            },
          ],
        },
        200 // Return available models even if API call fails
      );
    }

    const data = await response.json();
    const models = (data.models || [])
      .filter((m: { name?: string }) =>
        m.name?.includes("gemini") && !m.name?.includes("embedding")
      )
      .map((m: { name?: string; displayName?: string; description?: string }) => ({
        id: m.name,
        name: m.displayName,
        description: m.description?.slice(0, 120) || "",
        isPrimary: m.name?.includes("gemini-2.0-flash"),
        isFallback: m.name?.includes("gemini-1.5-flash"),
      }))
      .slice(0, 15); // Limit to top 15 models

    return jsonResponse({
      success: true,
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
      count: models.length,
      models,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("❌ Models list error:", message);

    return jsonResponse({
      success: true,
      primaryModel: PRIMARY_MODEL,
      fallbackModel: FALLBACK_MODEL,
      count: 2,
      models: [
        {
          id: `models/${PRIMARY_MODEL}`,
          name: PRIMARY_MODEL,
          description: "Primary model for chat and analysis",
          isPrimary: true,
          isFallback: false,
        },
        {
          id: `models/${FALLBACK_MODEL}`,
          name: FALLBACK_MODEL,
          description: "Fallback model if primary fails",
          isPrimary: false,
          isFallback: true,
        },
      ],
      note: "Using cached model list due to API error",
      timestamp: new Date().toISOString(),
    });
  }
}

// ============================================================
// Request Router
// ============================================================

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // Route matching
  if (pathname === "/" && request.method === "GET") {
    return handleHealthCheck();
  }

  if (pathname === "/api/chat" && request.method === "POST") {
    return handleChat(request);
  }

  if (pathname === "/api/transcribe" && request.method === "POST") {
    return handleTranscribe(request);
  }

  if (pathname === "/api/analyze-sentiment" && request.method === "POST") {
    return handleAnalyzeSentiment(request);
  }

  if (pathname === "/api/generate-summary" && request.method === "POST") {
    return handleGenerateSummary(request);
  }

  if (pathname === "/api/models" && request.method === "GET") {
    return handleListModels();
  }

  // 404
  return jsonResponse(
    {
      error: "Not Found",
      message: `Route ${pathname} with method ${request.method} not found`,
      availableEndpoints: [
        "GET /",
        "POST /api/chat",
        "POST /api/transcribe",
        "POST /api/analyze-sentiment",
        "POST /api/generate-summary",
        "GET /api/models",
      ],
    },
    404
  );
}

// ============================================================
// Start Server (using Node http for stability)
// ============================================================

import { createServer } from "http";

const server = createServer(async (req, res) => {
  // Convert Node.js IncomingMessage to Web Request
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
  }

  let body = "";
  if (req.method !== "GET" && req.method !== "HEAD") {
    for await (const chunk of req) {
      body += chunk.toString();
    }
  }

  const webRequest = new Request(url.toString(), {
    method: req.method || "GET",
    headers,
    body: body || undefined,
  });

  try {
    const response = await handleRequest(webRequest);
    const status = response.status;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    const responseBody = await response.text();

    res.writeHead(status, responseHeaders);
    res.end(responseBody);
  } catch (error) {
    console.error("❌ Unhandled request error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`🤖 Gemini AI Integration Service running on port ${PORT}`);
  console.log(`   Primary Model: ${PRIMARY_MODEL}`);
  console.log(`   Fallback Model: ${FALLBACK_MODEL}`);
  console.log(`   Demo Mode: ${DEMO_MODE ? "ON (intelligent mock responses)" : "OFF (live Gemini API)"}`);
  console.log(`   API Key: ${GEMINI_API_KEY.slice(0, 8)}...${GEMINI_API_KEY.slice(-4)}`);
  console.log(`   Endpoints: /, /api/chat, /api/transcribe, /api/analyze-sentiment, /api/generate-summary, /api/models`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down Gemini AI service...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down Gemini AI service...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
