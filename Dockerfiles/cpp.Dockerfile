# cpp.Dockerfile
FROM gcc:latest

# Optional: Create a non-root user for security
RUN useradd -m appuser

# Install nlohmann/json (needed for JSON parsing)
RUN apt-get update && apt-get install -y nlohmann-json3-dev

WORKDIR /app

# Copy both user code and the runner
COPY main.cpp .
COPY run.cpp .

# Compile the runner (which includes user code)
RUN g++ run.cpp -o main -std=c++17

USER appuser

CMD ["./main"]
