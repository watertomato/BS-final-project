FROM node:18-bullseye-slim
WORKDIR /app

# system deps for waiting for DB
RUN apt-get update && apt-get install -y netcat && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

# copy prisma migrations early so prisma generate can run
COPY prisma ./prisma
RUN npx prisma generate || true

# copy the rest of the backend source
COPY . .

# entrypoint will wait for DB, run migrations and start the app
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
CMD ["/usr/local/bin/entrypoint.sh"]





