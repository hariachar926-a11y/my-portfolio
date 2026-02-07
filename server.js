const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const CLIENTS = new Set();

function serveStatic(req, res) {
  const filePath = req.url === "/" ? "index.html" : req.url.slice(1);
  const resolved = path.join(__dirname, filePath);
  if (!fs.existsSync(resolved)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(resolved);
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8"
  };
  res.writeHead(200, { "Content-Type": map[ext] || "application/octet-stream" });
  fs.createReadStream(resolved).pipe(res);
}

function handleEvents(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
  CLIENTS.add(res);
  req.on("close", () => {
    CLIENTS.delete(res);
  });
}

function broadcast(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  CLIENTS.forEach((res) => res.write(data));
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/events") {
    handleEvents(req, res);
    return;
  }
  if (req.method === "POST" && req.url === "/api/click") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let payload = {};
      try {
        payload = JSON.parse(body || "{}");
      } catch (e) {
        payload = { action: "unknown" };
      }
      broadcast({ type: "click", ...payload });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
