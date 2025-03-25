# cpp.Dockerfile
FROM gcc:latest

# Optional: Create a non-root user for security
RUN useradd -m appuser

WORKDIR /app

COPY main.cpp .

RUN g++ main.cpp -o main

USER appuser

CMD ["./main"]
