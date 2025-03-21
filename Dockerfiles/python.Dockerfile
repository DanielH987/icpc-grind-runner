 
FROM python:3.11
WORKDIR /app
COPY . .
CMD ["python", "main.py"]
