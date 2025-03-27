const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const connection = new IORedis({ maxRetriesPerRequest: null });

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
            filename = "main.py";
            dockerfile = "python.Dockerfile";
        } else {
            filename = "main.cpp";
            dockerfile = "cpp.Dockerfile";
        }

        fs.writeFileSync(path.join(tempDir, filename), code);
        fs.writeFileSync(path.join(tempDir, "input.txt"), input);

        const imageTag = `code-runner-${id}`;

        return new Promise((resolve, reject) => {
            exec(`docker build -f Dockerfiles/${dockerfile} -t ${imageTag} ${tempDir}`, (err, stdout, stderr) => {
                if (err) {
                    job.updateReturnValue({ error: stderr });
                    return reject(stderr);
                }

                exec(`docker run --rm --memory=128m --cpus=".5" ${imageTag}`, (err, stdout, stderr) => {
                    exec(`docker rmi ${imageTag}`, () => { });
                    fs.rmSync(tempDir, { recursive: true, force: true });

                    const result = err ? { error: stderr } : { output: stdout };
                    job.updateReturnValue(result);
                    return resolve(result);
                });
            });
        });
    },
    { connection }
);

worker.on("completed", (job, result) => {
    console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
    console.error(`❌ Job ${job.id} failed: ${err.message}`);
});
