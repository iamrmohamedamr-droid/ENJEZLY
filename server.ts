import "dotenv/config";
import { createServer } from "node:http";
import { groqChat } from "./api/groq";

const server = createServer(async (req, res) => {
  if (req.url !== "/api/chat" || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }
  let raw = "";
  req.on("data", chunk => { raw += chunk; if (raw.length > 1_000_000) req.destroy(); });
  req.on("end", async () => {
    try {
      const body = JSON.parse(raw || "{}");
      const result = await groqChat(body);
      res.writeHead(result.status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
      res.end(JSON.stringify(result.data));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "بيانات الطلب غير صحيحة." }));
    }
  });
});
server.listen(3001, () => console.log("ENJEZLY AI API ready on http://localhost:3001"));
