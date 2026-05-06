const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";
const AI_PROVIDER = (process.env.AI_PROVIDER || "openai").toLowerCase();
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function sendJson(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.send(JSON.stringify(body));
}

function clean(value, maxLength = 1200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeParseJson(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}

function normalizeDraft(raw = {}) {
  const traits = Array.isArray(raw.traits)
    ? raw.traits
    : String(raw.traits || "")
        .split(/[，,、]/)
        .filter(Boolean);

  return {
    name: clean(raw.name, 80),
    species: clean(raw.species, 80),
    traits: traits.map((trait) => clean(trait, 24)).filter(Boolean).slice(0, 6),
    habits: clean(raw.habits, 800),
    routine: clean(raw.routine, 600),
    gestures: clean(raw.gestures, 600),
    favoritePlaces: clean(raw.favoritePlaces, 600),
    likes: clean(raw.likes, 500),
    dislikes: clean(raw.dislikes, 500),
    voice: clean(raw.voice, 500),
    comfortStyle: clean(raw.comfortStyle, 500),
    story: clean(raw.story, 900),
  };
}

function buildPrompt(story) {
  return [
    "你是 PawMemory 的宠物画像整理助手。",
    "用户会用自然语言讲述宠物故事。请从中提取宠物画像字段，只返回严格 JSON，不要 Markdown，不要解释。",
    "如果信息没有提到，就返回空字符串或空数组，不要编造事实。",
    "字段名必须是：name, species, traits, habits, routine, gestures, favoritePlaces, likes, dislikes, voice, comfortStyle, story。",
    "traits 是 3-6 个短标签数组，例如 ['温柔','爱玩','爱晒太阳']。",
    "voice 描述宠物如果表达时的语气，comfortStyle 描述适合陪伴用户的方式。",
    "story 保留一段最有情感的关系故事摘要。",
    "",
    `用户讲述：${story}`,
  ].join("\n");
}

async function callDeepSeek(story) {
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content: "你只输出 JSON。",
        },
        {
          role: "user",
          content: buildPrompt(story),
        },
      ],
      max_tokens: 700,
      temperature: 0.2,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "DeepSeek request failed.");
  return data.choices?.[0]?.message?.content || "";
}

async function callOpenAI(story) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: "你只输出 JSON。",
      input: buildPrompt(story),
      max_output_tokens: 700,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI request failed.");
  if (typeof data.output_text === "string") return data.output_text;
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" && content.text)
    .map((content) => content.text)
    .join("");
}

module.exports = async function profile(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (AI_PROVIDER === "deepseek" && !process.env.DEEPSEEK_API_KEY) {
    sendJson(res, 500, { error: "DEEPSEEK_API_KEY is not configured." });
    return;
  }

  if (AI_PROVIDER !== "deepseek" && !process.env.OPENAI_API_KEY) {
    sendJson(res, 500, { error: "OPENAI_API_KEY is not configured." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const story = clean(body.story, 3000);
    if (!story) {
      sendJson(res, 400, { error: "Story is required." });
      return;
    }

    const text = AI_PROVIDER === "deepseek" ? await callDeepSeek(story) : await callOpenAI(story);
    sendJson(res, 200, { draft: normalizeDraft(safeParseJson(text)) });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Profile extraction failed.",
    });
  }
};
