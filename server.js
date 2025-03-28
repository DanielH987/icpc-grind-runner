const express = require("express");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const https = require("https");
const { QueueEvents } = require("bullmq");
const { codeQueue, connection } = require("./queue");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 443;
const ALLOWED_LANGUAGES = ["js", "python", "cpp"];

// ✅ Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: "Too many requests. Please try again after a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/run", limiter);

const queueEvents = new QueueEvents("code-runner");

(async () => {
  await queueEvents.waitUntilReady();
  console.log("✅ QueueEvents is ready");
})();

app.post("/run", async (req, res) => {
  const { language, code, input = "" } = req.body;

  if (!ALLOWED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  try {
    console.log("🚀 Adding job to queue...");
    const job = await codeQueue.add("execute", { language, code, input });
    console.log(`📌 Job added: ${job.id}, waiting for completion...`);

    const result = await job.waitUntilFinished(queueEvents, 15000);
    console.log(`✅ Job completed:`, result);

    res.json({ result });
  } catch (err) {
    console.error("❌ Job failed:", err);
    res.status(500).json({ error: "Failed to execute job", detail: err.message });
  }
});

// // ✅ HTTPS server remains the same
// const httpsOptions = {
//   key: fs.readFileSync(path.join(__dirname, "selfsigned.key")),
//   cert: fs.readFileSync(path.join(__dirname, "selfsigned.crt")),
// };

// https.createServer(httpsOptions, app).listen(PORT, () => {
//   console.log(`✅ Code Runner HTTPS server running on port ${PORT}`);
// });

app.listen(PORT, () => {
  console.log(`✅ Code Runner server running on port ${PORT}`);
});