FROM node:alpine

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY main.js /app/main.js

USER appuser

CMD ["node", "/app/main.js"]
