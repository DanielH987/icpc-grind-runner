const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const connection = new IORedis({ maxRetriesPerRequest: null });

const extractCppFunctionName = (code) => {
    const match = code.match(/int\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
    if (!match) throw new Error("Could not extract function name from C++ code");
    const funcName = match[1];
    const args = match[2].split(',').map(arg => arg.trim()).filter(Boolean);
    return { funcName, args };
};

const renderCppRunnerTemplate = (template, funcName, args) => {
    const funcDeclArgs = args.map((_, i) => `int a${i}`).join(", ");
    const funcCallArgs = args.map((_, i) => `args[${i}]`).join(", ");
    return template
        .replace(/{{FUNC_NAME}}/g, funcName)
        .replace(/{{FUNC_DECL_ARGS}}/g, funcDeclArgs)
        .replace(/{{FUNC_CALL_ARGS}}/g, funcCallArgs);
};

function detectErrorType(stderr) {
    if (stderr.includes("SyntaxError")) return "SyntaxError";
    if (stderr.includes("ReferenceError")) return "ReferenceError";
    if (stderr.includes("NameError")) return "NameError";
    if (stderr.toLowerCase().includes("error")) return "RuntimeError";
    return "UnknownError";
}

function extractErrorMessage(stderr) {
    const lines = stderr.trim().split("\n");
    const userCodeIndex = lines.findIndex(line => line.includes("user_code.py"));

    if (userCodeIndex !== -1) {
        const errorLines = [];

        for (let i = userCodeIndex; i < lines.length; i++) {
            errorLines.push(lines[i]);

            if (/^\w*Error:/.test(lines[i])) {
                break;
            }
        }

        return errorLines.join("\n");
    }

    return lines[lines.length - 1] || "Unknown error";
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
            fs.writeFileSync(path.join(tempDir, filename), code);
            fs.copyFileSync(path.join(__dirname, "templates/js/run.js"), path.join(tempDir, "run.js"));

        } else if (language === "python") {
            filename = "user_code.py";
            dockerfile = "python.Dockerfile";
            fs.writeFileSync(path.join(tempDir, filename), code);
            fs.copyFileSync(path.join(__dirname, "templates/python/run.py"), path.join(tempDir, "main.py"));

        } else if (language === "cpp") {
            filename = "main.cpp";
            dockerfile = "cpp.Dockerfile";

            const { funcName, args: cppArgs } = extractCppFunctionName(code);
            const templateCpp = fs.readFileSync(path.join(__dirname, "templates/cpp/run.cpp"), "utf-8");
            const renderedRunCpp = renderCppRunnerTemplate(templateCpp, funcName, cppArgs);

            console.log("Generated run.cpp:\n", renderedRunCpp);

            fs.writeFileSync(path.join(tempDir, "main.cpp"), code);

            console.log("User main.cpp:\n", code);

            fs.writeFileSync(path.join(tempDir, "run.cpp"), renderedRunCpp);
        }

        fs.writeFileSync(path.join(tempDir, "input.txt"), input);

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
