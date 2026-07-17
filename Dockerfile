FROM node:18-alpine

# 设置时区为上海
RUN apk add tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo Asia/Shanghai > /etc/timezone && \
    apk del tzdata

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖（使用国内镜像源加速）
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/ && \
    npm install --only=production && \
    npm cache clean --force

# 复制应用代码
COPY . .

# 暴露端口（CloudBase 默认80）
EXPOSE 80

# 设置环境变量
ENV PORT=80
ENV NODE_ENV=production

# 启动服务
CMD ["node", "server.js"]
