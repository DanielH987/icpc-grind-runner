const fs = require("fs");

// Read input from stdin
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  try {
    const args = JSON.parse(input);
    const userFunc = require("./main");

    const originalLog = console.log;
    let capturedLogs = "";
    console.log = (...args) => {
      capturedLogs += args.join(" ") + "\n";
    };

    const result = userFunc(...args);
    console.log = originalLog;

    console.log(JSON.stringify({
      stdout: capturedLogs.trim(),
      output: result
    }));
  } catch (err) {
    console.log(JSON.stringify({
      stdout: "",
      output: null,
      error: err.message || "Unknown error"
    }));
  }
});
