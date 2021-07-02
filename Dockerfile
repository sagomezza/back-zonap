FROM node:14

RUN mkdir -p /var/www/zonap

WORKDIR /var/www/zonap

COPY package.json .

RUN npm install

COPY src .

EXPOSE 8000

CMD ["npm", "start"] 