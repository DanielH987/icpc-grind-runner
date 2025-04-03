const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const connection = new IORedis({ maxRetriesPerRequest: null });

function detectErrorType(stderr) {
    if (stderr.includes("SyntaxError")) return "SyntaxError";
    if (stderr.includes("ReferenceError")) return "ReferenceError";
    if (stderr.includes("NameError")) return "NameError";
    if (stderr.toLowerCase().includes("error")) return "RuntimeError";
    return "UnknownError";
}

function extractErrorMessage(stderr) {
    const lines = stderr.trim().split("\n");
    const lastLine = lines[lines.length - 1];
    return lastLine || "Unknown error";
}

const worker = new Worker(
    "code-runner",
    async job => {
        const { language, code, input } = job.data;

        const id = uuidv4();
        const tempDir = path.join(__dirname, "temp", id);
        fs.mkdirSync(tempDir, { recursive: true });

        let filename, dockerfile;
        if (language === "js") {
            filename = "main.js";
            dockerfile = "js.Dockerfile";
        } else if (language === "python") {
            filename = "user_code.py";
            dockerfile = "python.Dockerfile";
        } else {
            filename = "main.cpp";
            dockerfile = "cpp.Dockerfile";
        }

        fs.writeFileSync(path.join(tempDir, filename), code);
        fs.writeFileSync(path.join(tempDir, "input.txt"), input);

        if (language === "python") {
            const templatePath = path.join(
                __dirname,
                "templates",
                "python",
                job.name === "executeSecret" ? "run_secret.py" : "run.py"
            );
            fs.copyFileSync(templatePath, path.join(tempDir, "main.py"));
        }

        console.log(`job.name`, job.name);

        const imageTag = `code-runner-${id}`;
        const start = Date.now();

        return new Promise((resolve, reject) => {
            exec(`docker build -f Dockerfiles/${dockerfile} -t ${imageTag} ${tempDir}`, (err, buildOut, buildErr) => {
                if (err) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return resolve({
                        success: false,
                        stdout: "",
                        output: null,
                        error: {
                            type: "CompilationError",
                            message: extractErrorMessage(buildErr),
                            raw: buildErr
                        },
                        time: "0.00s"
                    });
                }

                exec(`docker run --rm --memory=128m --cpus=".5" -i ${imageTag} < ${path.join(tempDir, "input.txt")}`, (err, stdout, stderr) => {
                    const time = ((Date.now() - start) / 1000).toFixed(2) + "s";
                    exec(`docker rmi ${imageTag}`, () => { });
                    fs.rmSync(tempDir, { recursive: true, force: true });

                    if (err) {
                        return resolve({
                            success: false,
                            stdout: stdout || "",
                            output: null,
                            error: {
                                type: detectErrorType(stderr),
                                message: extractErrorMessage(stderr),
                                raw: stderr
                            },
                            time
                        });
                    }

                    try {
                        const parsed = JSON.parse(stdout);
                        return resolve({
                            success: true,
                            stdout: parsed.stdout,
                            output: parsed.output,
                            time
                        });
                    } catch (e) {
                        return resolve({
                            success: false,
                            stdout,
                            output: null,
                            error: {
                                type: "ParseError",
                                message: "Failed to parse output",
                                raw: stdout
                            },
                            time
                        });
                    }
                });
            });
        });
    },
    { connection }
);

worker.on("completed", (job, result) => {
    console.log(`✅ Job ${job.id} completed`, result);
});

worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job.id} failed: ${err.message}`);
});
