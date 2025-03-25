const express = require("express");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TIMEOUT = 5000; // 5 seconds timeout
const ALLOWED_LANGUAGES = ["js", "python", "cpp"];
const MAX_CONCURRENT_RUNS = 5; // Adjust as needed
let activeRuns = 0;

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

app.listen(PORT, () => {
  console.log(`Code Runner listening on port ${PORT}`);
});
