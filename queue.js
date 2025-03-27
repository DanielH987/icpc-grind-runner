const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(); // localhost Redis

const codeQueue = new Queue("code-runner", { connection });

module.exports = codeQueue;
