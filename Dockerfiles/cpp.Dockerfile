# Dockerfiles/cpp.Dockerfile
FROM gcc:latest

# Create a non-root user (optional but good practice)
RUN useradd -m appuser

# Install JSON library
RUN apt-get update && apt-get install -y nlohmann-json3-dev

WORKDIR /app

# Copy code files
COPY main.cpp .
COPY run.cpp .
COPY input.txt .

# Compile both user and runner code
RUN g++ main.cpp run.cpp -o main -std=c++17

# Run as non-root
USER appuser

# Run program with stdin redirected
CMD ["./main"]
