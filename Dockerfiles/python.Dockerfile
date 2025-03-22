FROM python:alpine

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY main.py /app/main.py

USER appuser

CMD ["python3", "/app/main.py"]
