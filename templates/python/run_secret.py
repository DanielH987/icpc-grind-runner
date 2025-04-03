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

def convert_token(val):
    try:
        return int(val)
    except ValueError:
        try:
            return float(val)
        except ValueError:
            return val  # fallback to string

def parse_input(input_data):
    lines = input_data.strip().splitlines()
    if not lines:
        return []

    # First line: individual arguments
    first_line = [convert_token(x) for x in lines[0].strip().split()]

    # Remaining lines: list of lists
    rest = []
    for line in lines[1:]:
        if line.strip():
            row = [convert_token(x) for x in line.strip().split()]
            rest.append(row)

    if rest:
        return first_line + [rest]
    else:
        return first_line

def run():
    input_data = sys.stdin.read()
    input_args = parse_input(input_data)

    f = io.StringIO()
    with redirect_stdout(f):
        func_name = extract_function_name("user_code.py")
        import user_code # type: ignore
        func = getattr(user_code, func_name)
        result = func(*input_args)

    stdout = f.getvalue()
    print(json.dumps({
        "stdout": stdout,
        "output": result
    }))

if __name__ == "__main__":
    run()
