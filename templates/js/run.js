const fs = require("fs");

// Read input from stdin
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  try {
    const args = JSON.parse(input); // should be an array of arguments

    // Load user's function from main.js
    const userFunc = require("./main");

    // Capture console output
    const originalLog = console.log;
    let capturedLogs = "";
    console.log = (...args) => {
      capturedLogs += args.join(" ") + "\n";
    };

    // Call the function
    const result = userFunc(...args);

    // Restore original console.log
    console.log = originalLog;

    console.log(JSON.stringify({
      stdout: capturedLogs.trim(),
      output: result
    }));
  } catch (err) {
    console.log(JSON.stringify({
      stdout: "",
      output: null,
      error: err.message
    }));
  }
});
