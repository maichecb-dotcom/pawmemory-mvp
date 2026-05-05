const { handler } = require("../netlify/functions/chat");

module.exports = async function chat(req, res) {
  const result = await handler({
    httpMethod: req.method,
    body: typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
  });

  Object.entries(result.headers || {}).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  res.status(result.statusCode || 200).send(result.body || "");
};
