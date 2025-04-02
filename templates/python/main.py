# templates/python/main.py
import sys
import json
import io
from contextlib import redirect_stdout

from user_code import Solution

def run():
    input_data = sys.stdin.read()
    f = io.StringIO()
    with redirect_stdout(f):
        result = Solution().mostPoints(eval(input_data))

    stdout = f.getvalue()
    print(json.dumps({
        "stdout": stdout,
        "output": result
    }))

if __name__ == "__main__":
    run()
