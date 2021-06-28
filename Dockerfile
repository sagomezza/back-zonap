FROM node:13.13

RUN mkdir -p /var/www/zonap

WORKDIR /var/www/zonap

COPY package.json .

RUN npm install

COPY src .

EXPOSE 3000 443 80

CMD ["npm", "start"] 