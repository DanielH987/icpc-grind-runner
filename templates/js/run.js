const fs = require("fs");

// Read input from stdin
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  try {
    const args = JSON.parse(input); // expects list/array of args
    const userFunc = require("./main"); // User code exports a function
    const result = userFunc(...args);   // Call with unpacked args

    console.log(JSON.stringify({
      stdout: "", // JS doesn't easily redirect console.log
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
