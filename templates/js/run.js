const fs = require("fs");

let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  let capturedLogs = "";
  const originalLog = console.log;
  console.log = (...args) => {
    capturedLogs += args.join(" ") + "\n";
  };

  try {
    const args = JSON.parse(input);
    const userFunc = require("./main");

    const result = userFunc(...args);

    // Restore logging before final output
    console.log = originalLog;

    // Output result as JSON
    console.log(JSON.stringify({
      stdout: capturedLogs.trim(),
      output: result
    }));
  } catch (err) {
    // Make sure to restore log even on error
    console.log = originalLog;
    console.log(JSON.stringify({
      stdout: capturedLogs.trim(),
      output: null,
      error: err.message || "Unknown error"
    }));
  }
});
