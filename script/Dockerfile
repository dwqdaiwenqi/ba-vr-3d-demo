# 国服使用 FROM harbor.yostar.net/base/nginx:1.25.0
FROM harbor-oversea.yo-star.com/base/nginx:1.25.0

RUN rm -rf /etc/nginx/conf.d/default.conf
COPY /dist /data/web
COPY nginx.conf /etc/nginx/conf.d/

CMD ["nginx", "-g", "daemon off;"]