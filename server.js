 
const express = require("express");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post("/run", async (req, res) => {
  const { language, code, input = "" } = req.body;

  if (!["js", "python", "cpp"].includes(language)) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  const id = uuidv4();
  const tempDir = path.join(__dirname, "temp", id);
  fs.mkdirSync(tempDir, { recursive: true });

  let filename;
  let dockerfile;
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

  exec(
    `docker build -f Dockerfiles/${dockerfile} -t ${imageTag} ${tempDir}`,
    (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ error: stderr });
      }

      exec(
        `docker run --rm -m 128m --cpus=".5" ${imageTag}`,
        (err, stdout, stderr) => {
          // Cleanup
          exec(`docker rmi ${imageTag}`, () => {});
          fs.rmSync(tempDir, { recursive: true, force: true });

          if (err) {
            return res.status(200).json({ error: stderr });
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
