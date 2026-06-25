FROM nginx:alpine

RUN apk add --no-cache openssl ca-certificates \
  && update-ca-certificates \
  && mkdir -p /etc/nginx/certs \
  && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/leap.local.key \
    -out /etc/nginx/certs/leap.local.crt \
    -subj "/C=CN/ST=Shanghai/L=Shanghai/O=LEAP Real Estate Advisory/CN=localhost"

COPY public/ /usr/share/nginx/html/
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
