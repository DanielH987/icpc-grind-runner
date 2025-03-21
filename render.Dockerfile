# Use Node.js as base
FROM node:18

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Expose port 3001 for the server
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
