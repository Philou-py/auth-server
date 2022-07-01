FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN chown -R node:node .
USER node
EXPOSE 3003
CMD ["npm", "run", "start"]
