const express = require("express");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");
const https = require("https");
const { QueueEvents } = require("bullmq");
const { codeQueue, connection } = require("./queue");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const ALLOWED_LANGUAGES = ["javaScript", "python", "cpp", "java"];

// ✅ Rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  message: { error: "Too many requests. Please try again after a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/run", limiter);
app.use("/runSecret", limiter);

const queueEvents = new QueueEvents("code-runner");

(async () => {
  await queueEvents.waitUntilReady();
  console.log("✅ QueueEvents is ready");
})();

app.post("/run", async (req, res) => {
  const { language, code, input = "", answers = "" } = req.body;

  if (!ALLOWED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  let parsedInput, parsedAnswers;
  try {
    parsedInput = JSON.parse(input);
    parsedAnswers = JSON.parse(answers);
  } catch (parseErr) {
    return res.status(400).json({ error: "Invalid JSON input or answers" });
  }

  if (!Array.isArray(parsedInput) || !Array.isArray(parsedAnswers)) {
    return res.status(400).json({ error: "Input and answers must be arrays" });
  }

  if (parsedInput.length !== parsedAnswers.length) {
    return res.status(400).json({ error: "Input and answers length mismatch" });
  }

  try {
    const results = [];

    for (let i = 0; i < parsedInput.length; i++) {
      const item = parsedInput[i];
      const expectedOutput = parsedAnswers[i];

      console.log("🚀 Adding job to queue...");
      console.log(`🌟 Job input: ${JSON.stringify(item)}`);
      const job = await codeQueue.add("execute", {
        language,
        code,
        input: JSON.stringify(item),
      });

      console.log(`📌 Job added: ${job.id}, waiting for completion...`);
      const result = await job.waitUntilFinished(queueEvents, 15000);
      console.log(`✅ Job completed:`, result);

      if (!result.success) {
        return res.status(200).json({
          error: {
            message: result.error.message,
            type: result.error.type,
            raw: result.error.raw,
          },
          time: result.time,
        });
      }

      const actualOutput = result.output;
      const passed = JSON.stringify(actualOutput) === JSON.stringify(expectedOutput);

      results.push({
        expected: expectedOutput,
        output: actualOutput,
        passed,
        result,
      });
    }

    res.json({ results });
  } catch (err) {
    console.error("❌ Job failed:", err);
    res.status(500).json({ error: "Failed to execute job", detail: err.message });
  }
});

app.post("/runSecret", async (req, res) => {
  const { language, code, problemId } = req.body;

  console.log("🚀 code.", code);

  if (!ALLOWED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  const problemDir = path.join(__dirname, "secret", problemId);

  try {
    if (!fs.existsSync(problemDir)) {
      return res.status(404).json({ error: "Problem not found." });
    }

    const files = fs.readdirSync(problemDir).filter(file => file.endsWith(".json"));

    if (files.length === 0) {
      return res.status(400).json({ error: "No test cases found for this problem." });
    }

    const results = [];
    let passedCount = 0;

    for (const file of files) {
      const inputPath = path.join(problemDir, file);
      const ansPath = path.join(problemDir, file.replace(".json", ".ans"));

      const input = fs.readFileSync(inputPath, "utf-8").trim();
      const expectedOutput = fs.existsSync(ansPath)
        ? fs.readFileSync(ansPath, "utf-8").trim()
        : null;

      console.log(`🚀 Running test case: ${file}`);
      const parsedInput = JSON.parse(input);
      const job = await codeQueue.add("executeSecret", { language, code, input: JSON.stringify(parsedInput) });
      const output = await job.waitUntilFinished(queueEvents, 15000);
      console.log(`🔍 Test case output:`, output);
      const actualOutput = String(output.output ?? "").trim();
      const passed = expectedOutput !== null ? actualOutput === expectedOutput : null;

      if (passed === true) passedCount++;

      if (!output.success) {
        return res.status(200).json({
          error: {
            message: output.error.message,
            type: output.error.type,
            raw: output.error.raw,
          },
          time: output.time,
        });
      }

      results.push({
        testCase: file,
        input,
        output: actualOutput,
        expected: expectedOutput,
        passed,
      });
    }

    res.json({
      problemId,
      totalCount: results.length,
      passedCount,
      passed: passedCount === results.length,
      message: `${passedCount}/${results.length} testcases passed`,
      results: results,
    });
  } catch (err) {
    console.error("❌ Error during secret execution:", err);
    res.status(500).json({ error: "Failed to run secret test cases", detail: err.message });
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

app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Code Runner server running on port ${PORT}`);
});