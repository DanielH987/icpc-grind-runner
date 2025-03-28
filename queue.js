const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis({ maxRetriesPerRequest: null });

const codeQueue = new Queue("code-runner", { connection });

module.exports = {
    codeQueue,
    connection,
};
