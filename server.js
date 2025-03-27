const express = require("express");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const https = require("https");
const { Job } = require("bullmq");
const codeQueue = require("./queue");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 443;
const ALLOWED_LANGUAGES = ["js", "python", "cpp"];

// ✅ Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: {
    error: "Too many requests. Please try again after a minute.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/run", limiter);

// ✅ Replace /run logic to enqueue the job
app.post("/run", async (req, res) => {
  const { language, code, input = "" } = req.body;

  if (!ALLOWED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  try {
    // Add job to queue
    const job = await codeQueue.add("execute", { language, code, input });

    // Wait until job is completed (or failed)
    const result = await job.waitUntilFinished();

    return res.json(result); // return output or error directly
  } catch (err) {
    return res.status(500).json({ error: "Execution failed or timed out" });
  }
});

// ✅ HTTPS server remains the same
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "selfsigned.key")),
  cert: fs.readFileSync(path.join(__dirname, "selfsigned.crt")),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`✅ Code Runner HTTPS server running on port ${PORT}`);
});

// app.listen(3001, () => {
//   console.log(`✅ Code Runner server running on port ${PORT}`);
// });