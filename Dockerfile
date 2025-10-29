FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (skip prepare scripts to avoid build errors)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript manually
RUN pnpm build

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "dist/program.js", "--port", "3000", "--host", "0.0.0.0"]
