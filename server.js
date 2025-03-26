const express = require("express");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TIMEOUT = 5000; // 5 seconds timeout
const ALLOWED_LANGUAGES = ["js", "python", "cpp"];
const MAX_CONCURRENT_RUNS = 5; // Adjust as needed
let activeRuns = 0;

// Limit to 50 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Limit each IP to 50 requests per `window` (per minute)
  message: {
    error: "Too many requests. Please try again after a minute.",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});
app.use("/run", limiter);

app.post("/run", async (req, res) => {
  const { language, code, input = "" } = req.body;

  if (!ALLOWED_LANGUAGES.includes(language)) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  if (activeRuns >= MAX_CONCURRENT_RUNS) {
    return res.status(429).json({ error: "Too many concurrent executions" });
  }

  const id = uuidv4();
  const tempDir = path.join(__dirname, "temp", id);
  fs.mkdirSync(tempDir, { recursive: true });

  let filename, dockerfile;
  if (language === "js") {
    filename = "main.js";
    dockerfile = "js.Dockerfile";
  } else if (language === "python") {
    filename = "main.py";
    dockerfile = "python.Dockerfile";
  } else {
    filename = "main.cpp";
    dockerfile = "cpp.Dockerfile";
  }

  const filePath = path.join(tempDir, filename);
  fs.writeFileSync(filePath, code);

  const inputPath = path.join(tempDir, "input.txt");
  fs.writeFileSync(inputPath, input);

  const imageTag = `code-runner-${id}`;
  const dockerfilePath = path.join("Dockerfiles", dockerfile);

  activeRuns++;
  exec(
    `docker build -f ${dockerfilePath} -t ${imageTag} ${tempDir}`,
    { timeout: TIMEOUT },
    (err, stdout, stderr) => {
      if (err) {
        activeRuns--;
        fs.rmSync(tempDir, { recursive: true, force: true });
        return res.status(500).json({ error: stderr || stdout || "Docker build failed" });
      }

      // Only run if build succeeded
      exec(
        `docker run --rm --memory=128m --cpus=".5" --security-opt no-new-privileges --security-opt seccomp=unconfined -i ${imageTag} < ${inputPath}`,
        { timeout: TIMEOUT },
        (err, stdout, stderr) => {
          activeRuns--;
          exec(`docker rmi ${imageTag}`, () => {}); // cleanup image
          fs.rmSync(tempDir, { recursive: true, force: true }); // cleanup temp

          if (err) {
            return res.status(200).json({ error: stderr || stdout || "Execution failed" });
          }

          return res.json({ output: stdout });
        }
      );
    }
  );
});

const https = require("https");

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "selfsigned.key")),
  cert: fs.readFileSync(path.join(__dirname, "selfsigned.crt")),
};

https.createServer(httpsOptions, app).listen(443, () => {
  console.log("✅ Code Runner HTTPS server running on port 443");
});
