# 使用官方Node.js镜像作为基础镜像
FROM node:19

# 设置工作目录
WORKDIR /usr/src/app

# 复制package.json和其他可能的依赖文件
COPY package*.json ./

# 安装项目依赖，包括开发依赖
RUN npm install --also=dev

# 复制所有源代码到工作目录
COPY . .

# 暴露3001端口
EXPOSE 3001

# 定义环境变量
ENV NODE_ENV=production

# 运行应用程序
CMD ["npm", "start"]
