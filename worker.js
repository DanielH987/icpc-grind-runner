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

    // Step 1: Read user code
    let code = fs.readFileSync("./main.js", "utf-8");

    // Step 2: Extract the function name
    const match = code.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
    if (!match) throw new Error("Could not extract function name");
    const funcName = match[1];

    // Step 3: Inject `global.<name> = <name>;` to expose it
    code += `\nglobal.${funcName} = ${funcName};`;

    // Step 4: Evaluate the code in current context
    eval(code);

    // Step 5: Get the function from global scope
    const userFunc = global[funcName];
    if (typeof userFunc !== "function") {
      throw new Error(`Function "${funcName}" is not defined properly`);
    }

    // Step 6: Run the function
    const result = userFunc(...args);

    console.log = originalLog;
    console.log(JSON.stringify({
      stdout: capturedLogs.trim(),
      output: result
    }));
  } catch (err) {
    console.log = originalLog;
    console.log(JSON.stringify({
      stdout: capturedLogs.trim(),
      output: null,
      error: err.message || "Unknown error"
    }));
  }
});
