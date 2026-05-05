function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(body));
}

function clean(value, maxLength = 1200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

module.exports = async function feedback(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const endpoint = process.env.FORMSPREE_ENDPOINT;
  if (!endpoint) {
    json(res, 500, {
      error: "FORMSPREE_ENDPOINT is not configured in Vercel environment variables.",
    });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const submittedAt = new Date().toISOString();
    const answer = {
      _subject: "PawMemory 用户试用反馈",
      submitted_at: submittedAt,
      pet_name: clean(payload.pet_name, 80),
      name: clean(payload.name, 80),
      contact: clean(payload.contact, 160),
      user_type: clean(payload.user_type, 160),
      first_impression: clean(payload.first_impression, 300),
      profile_willingness: clean(payload.profile_willingness, 300),
      hardest_profile_field: clean(payload.hardest_profile_field, 600),
      memory_value: clean(payload.memory_value, 300),
      ai_similarity: clean(payload.ai_similarity, 300),
      best_or_worst_reply: clean(payload.best_or_worst_reply, 1000),
      uncomfortable_moment: clean(payload.uncomfortable_moment, 1000),
      favorite_feature: clean(payload.favorite_feature, 300),
      biggest_friction: clean(payload.biggest_friction, 1000),
      next_feature: clean(payload.next_feature, 1000),
      payment_intent: clean(payload.payment_intent, 300),
      final_comment: clean(payload.final_comment, 1000),
      page_url: clean(payload.page_url, 300),
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(answer),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Formspree request failed: ${response.status}`);
    }

    json(res, 200, { ok: true });
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : "Feedback submit failed.",
    });
  }
};
