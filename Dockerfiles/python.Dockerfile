FROM python:3.10-slim

WORKDIR /app

COPY main.py .
COPY user_code.py .

RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

CMD ["python3", "main.py"]
