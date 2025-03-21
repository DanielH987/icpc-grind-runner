 
FROM node:18
WORKDIR /app
COPY . .
CMD ["node", "main.js"]
