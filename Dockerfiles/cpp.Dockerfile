FROM gcc:latest AS builder

WORKDIR /app

COPY main.cpp /app/main.cpp

RUN g++ main.cpp -o main

FROM alpine

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/main /app/main

USER appuser

CMD ["/app/main"]
