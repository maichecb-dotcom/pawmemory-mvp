const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

loadEnvFile(path.join(__dirname, ".env"));

const chat = require("./api/chat");
const config = require("./api/config");
const profile = require("./api/profile");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = __dirname;
const API_ROUTES = {
  "/api/chat": chat,
  "/api/config": config,
  "/api/profile": profile,
};

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (API_ROUTES[requestUrl.pathname]) {
      await handleApiRequest(req, res, API_ROUTES[requestUrl.pathname]);
      return;
    }

    await serveStatic(requestUrl.pathname, res);
  } catch (error) {
    console.error("Server error:", error);
    sendText(res, 500, "Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`PawMemory server running at http://127.0.0.1:${PORT}`);
});

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

async function handleApiRequest(req, res, handler) {
  const body = await readBody(req);
  const apiReq = {
    body: parseBody(body),
    headers: req.headers,
    method: req.method,
    url: req.url,
  };
  const apiRes = createApiResponse(res);

  await handler(apiReq, apiRes);
  if (!apiRes.sent) apiRes.send("");
}

function createApiResponse(res) {
  return {
    sent: false,
    statusCode: 200,
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      if (this.sent) return this;
      this.sent = true;
      res.statusCode = this.statusCode;
      res.end(body);
      return this;
    },
    json(body) {
      this.setHeader("Content-Type", "application/json");
      return this.send(JSON.stringify(body));
    },
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseBody(body) {
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function serveStatic(pathname, res) {
  const normalizedPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.resolve(PUBLIC_DIR, `.${normalizedPath}`);

  if (!filePath.startsWith(PUBLIC_DIR) || shouldBlockFile(filePath)) {
    sendText(res, 404, "Not Found");
    return;
  }

  const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : path.join(PUBLIC_DIR, "index.html");
  const ext = path.extname(target).toLowerCase();
  res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
  if (target.endsWith("index.html")) res.setHeader("Cache-Control", "no-store");
  fs.createReadStream(target)
    .on("error", () => sendText(res, 404, "Not Found"))
    .pipe(res);
}

function shouldBlockFile(filePath) {
  const basename = path.basename(filePath);
  return basename.startsWith(".") || filePath.includes(`${path.sep}.git${path.sep}`) || filePath.endsWith(".docx");
}

function sendText(res, status, text) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end(text);
}
