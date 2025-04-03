import sys
import json
import io
import re
from contextlib import redirect_stdout

def extract_function_name(code_path):
    with open(code_path, "r") as f:
        content = f.read()
    match = re.search(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", content)
    if match:
        return match.group(1)
    raise Exception("Could not extract function name")

def run():
    input_data = sys.stdin.read()
    input_args = eval(input_data)  # expects input to be a tuple or list of args

    # Capture stdout
    f = io.StringIO()
    with redirect_stdout(f):
        # Load the user function dynamically
        func_name = extract_function_name("user_code.py")
        import user_code
        func = getattr(user_code, func_name)

        # Call the function with unpacked arguments
        result = func(*input_args)

    stdout = f.getvalue()
    print(json.dumps({
        "stdout": stdout,
        "output": result
    }))

if __name__ == "__main__":
    run()
