# js.Dockerfile
FROM node:alpine

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy both user code and runner
COPY main.js .
COPY run.js .

USER appuser

CMD ["node", "run.js"]
