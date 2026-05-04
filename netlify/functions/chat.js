const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
const AI_PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (AI_PROVIDER === "deepseek" && !process.env.DEEPSEEK_API_KEY) {
    return jsonResponse(500, {
      error: "DEEPSEEK_API_KEY is not configured in Netlify environment variables.",
    });
  }

  if (AI_PROVIDER !== "deepseek" && !process.env.OPENAI_API_KEY) {
    return jsonResponse(500, {
      error: "OPENAI_API_KEY is not configured in Netlify environment variables.",
    });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const message = sanitizeText(payload.message, 1200);
    const pet = normalizePet(payload.pet);
    const memories = normalizeMemories(payload.memories);
    const chat = normalizeChat(payload.chat);

    if (!message) {
      return jsonResponse(400, { error: "Message is required." });
    }

    const reply =
      AI_PROVIDER === "deepseek"
        ? await createDeepSeekReply({ pet, memories, chat, message })
        : await createOpenAIReply({ pet, memories, chat, message });

    if (!reply) {
      return jsonResponse(502, { error: "The AI provider returned an empty response." });
    }

    return jsonResponse(200, { reply });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Unexpected server error.",
    });
  }
};

async function createOpenAIReply({ pet, memories, chat, message }) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: buildInstructions(pet, memories),
      input: buildOpenAIInput(chat, message),
      max_output_tokens: 420,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "OpenAI request failed.");
  }

  return extractOpenAIOutputText(data);
}

async function createDeepSeekReply({ pet, memories, chat, message }) {
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: buildChatMessages(pet, memories, chat, message),
      max_tokens: 420,
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "DeepSeek request failed.");
  }

  return data.choices?.[0]?.message?.content?.trim() || "";
}

function buildInstructions(pet, memories) {
  return [
    "You are the AI companion inside PawMemory, a pet memory and gentle companionship app.",
    "Respond in Simplified Chinese unless the user clearly uses another language.",
    "You are not the pet's resurrected consciousness. You are a memorial interaction inspired by the pet profile and saved memories.",
    "Do not claim the pet is literally alive, returned, watching from another world, or able to make real promises.",
    "Write like a calm product experience, not a roleplay transcript.",
    "Do not use parenthesized stage directions, screenplay style, sound effects, or first-person animal monologues.",
    "Prefer concrete observed behaviors: posture, small habits, favorite places, routine, and sensory memories.",
    "You may say '如果是 Momo，它可能会...' or '这让我想起...' instead of pretending to literally be the pet.",
    "Keep replies short: 2 to 4 gentle sentences. Avoid long explanations, therapy jargon, dramatic language, and excessive poetic language.",
    "If the user says they miss the pet, validate the feeling briefly and connect to one specific memory or habit.",
    "If the user expresses self-harm, suicide, or immediate danger, stop roleplay and encourage contacting trusted people or local emergency services immediately.",
    "",
    `Pet name: ${pet.name}`,
    `Species/breed: ${pet.species}`,
    `Traits: ${pet.traits.join(", ") || "unknown"}`,
    `Habits: ${pet.habits}`,
    `Routine: ${pet.routine}`,
    `Gestures: ${pet.gestures}`,
    `Likes: ${pet.likes}`,
    `Dislikes: ${pet.dislikes}`,
    `Preferred voice: ${pet.voice}`,
    `User comfort preference: ${pet.comfortStyle}`,
    "",
    "Saved memories:",
    memories.length
      ? memories.map((memory, index) => `${index + 1}. ${memory.date} ${memory.title}: ${memory.body}`).join("\n")
      : "No saved memories yet.",
  ].join("\n");
}

function buildOpenAIInput(chat, message) {
  const recentMessages = chat.slice(-8).map((item) => ({
    role: item.role === "pet" ? "assistant" : "user",
    content: [
      {
        type: item.role === "pet" ? "output_text" : "input_text",
        text: sanitizeText(item.text, 800),
      },
    ],
  }));

  return [
    ...recentMessages,
    {
      role: "user",
      content: [{ type: "input_text", text: message }],
    },
  ];
}

function buildChatMessages(pet, memories, chat, message) {
  const recentMessages = chat.slice(-8).map((item) => ({
    role: item.role === "pet" ? "assistant" : "user",
    content: sanitizeText(item.text, 800),
  }));

  return [
    {
      role: "system",
      content: buildInstructions(pet, memories),
    },
    ...recentMessages,
    {
      role: "user",
      content: message,
    },
  ];
}

function normalizePet(rawPet = {}) {
  const traits = Array.isArray(rawPet.traits) ? rawPet.traits : [];
  return {
    name: sanitizeText(rawPet.name, 80) || "这只宠物",
    species: sanitizeText(rawPet.species, 80) || "宠物",
    traits: traits.map((trait) => sanitizeText(trait, 40)).filter(Boolean).slice(0, 8),
    habits: sanitizeText(rawPet.habits, 800),
    routine: sanitizeText(rawPet.routine, 600),
    gestures: sanitizeText(rawPet.gestures, 600),
    likes: sanitizeText(rawPet.likes, 500),
    dislikes: sanitizeText(rawPet.dislikes, 500),
    voice: sanitizeText(rawPet.voice, 500),
    comfortStyle: sanitizeText(rawPet.comfortStyle, 500),
  };
}

function normalizeMemories(rawMemories = []) {
  if (!Array.isArray(rawMemories)) return [];

  return rawMemories
    .slice(0, 8)
    .map((memory) => ({
      title: sanitizeText(memory.title, 120),
      date: sanitizeText(memory.date, 40),
      body: sanitizeText(memory.body, 700),
    }))
    .filter((memory) => memory.title || memory.body);
}

function normalizeChat(rawChat = []) {
  if (!Array.isArray(rawChat)) return [];

  return rawChat
    .filter((item) => item && (item.role === "user" || item.role === "pet") && item.text)
    .map((item) => ({
      role: item.role,
      text: sanitizeText(item.text, 800),
    }));
}

function sanitizeText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function extractOpenAIOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text.trim();

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" && content.text)
    .map((content) => content.text)
    .join("")
    .trim();
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}
