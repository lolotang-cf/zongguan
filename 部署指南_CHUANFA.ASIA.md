# 综管平台 V21 → 腾讯云 CloudBase Run 部署 + CHUANFA.ASIA 绑定指南

> 适用环境：`zongguan-platform-283436-10`（即 CHUANFA.ASIA 指向的那个腾讯云账号空间）
> 当前状态：服务已"启动"（默认域名可访问，返回 200），但跑的是旧版 `app.js?v=6`。
> 目标：把 GitHub 上的 V21（含全部真实二级弹窗 + 后台登录/API）部署进去，并让 CHUANFA.ASIA 域名生效。

---

## 第一部分：把 V21 部署到腾讯云（控制台操作，约 5 分钟）

### 前置确认
- GitHub 仓库：`https://github.com/lolotang-cf/zongguan.git`（V21 代码已推送，`main` 分支最新）
- 你已登录腾讯云控制台，并打开 **云开发 CloudBase → 环境 `zongguan-platform-283436-10` → 云托管（CloudBase Run）**

### 步骤
1. 在云托管页面，找到服务 **`zongguan-platform`**，点进去。
2. 点顶部 **「新建版本」/「部署」/「版本管理」→「新建版本」**。
3. 部署方式选择 **「代码仓库」**（关联 GitHub）：
   - 如果是首次关联，按提示授权 GitHub（选 `lolotang-cf/zongguan` 仓库，分支 `main`）。
   - 已关联过则直接选该仓库 + `main` 分支。
   - *(备选：若控制台不支持直连 GitHub，选「代码包」→ 下载仓库 zip：在 GitHub 页面点 Code → Download ZIP，解压后整个文件夹上传)*
4. 构建配置（关键，照填）：
   - **运行环境 / 语言**：Node.js
   - **启动命令**：`node server/index.js`  ← 注意是 `server/index.js`，不是 `server.js`
   - **监听端口 / 容器端口**：`80`  ← Dockerfile 里写的是 80
   - **Dockerfile**：用仓库自带的 `Dockerfile`（默认即可）
   - 其余（CPU 0.5 / 内存 1G / 最小实例 0）保持默认
5. 点「开始部署」，等 1~3 分钟构建镜像 + 启动（状态变「正常/运行中」）。
6. 部署完成后，在版本列表里把**新版本设为「默认流量」/「流量 100%」**（否则旧版仍在服务）。
7. 验证：
   - 打开默认域名 `https://zongguan-platform-283436-10-1433159234.sh.run.tcloudbase.com/`
   - 右键查看源代码，确认 `<script src="/js/app.js?v=21">`（V21 缓存戳）即成功。

---

## 第二部分：绑定 CHUANFA.ASIA 自定义域名（约 3 分钟）

> CHUANFA.ASIA 的 DNS 已经 CNAME 指向 `zongguan-platform-283436-10-1433159234.sh.run.tcloudbase.com`，
> 所以只需要**在 HTTP 网关里把域名加进去并完成校验**，不用改 DNS。

### 步骤
1. 在 `zongguan-platform` 服务详情页，找 **「自定义域名」/「HTTP 网关」/「访问配置」** 入口
   （你之前截图里底部那个「自定义域名」区域，提示"请前往 HTTP 网关操作"）。
2. 点 **「添加自定义域名」/「新建」**，填入：
   - 域名：`CHUANFA.ASIA`
3. 提交后，平台会要求**域名校验**（证明这域名是你的）：
   - 通常会给你一条 **TXT 记录** 或 **CNAME 校验值**，让你去域名 DNS 处添加。
   - 去你买域名的地方（阿里云/腾讯云域名/DNSPod 等），给 CHUANFA.ASIA 加这条校验记录。
   - 加完回控制台点「验证」/「校验」。
4. 校验通过后，平台会给一个 **CNAME 目标地址**（形如 `xxx.tcloudbaseapp.com` 或 `xxx.sh.run.tcloudbase.com`）。
   - 确认 CHUANFA.ASIA 的 CNAME 已经是这个值（你之前已经指向 `zongguan-platform-283436-10-1433159234.sh.run.tcloudbase.com`，一般直接通过）。
5. 等 1~10 分钟（DNS 生效），打开 **https://CHUANFA.ASIA/** 即可看到 V21 登录页。

### 常见问题
- **打开 CHUANFA.ASIA 还是 404 / 空白**：服务可能没把新版本设为默认流量（回第一部分第 6 步），或自定义域名校验还没过。
- **提示证书/不安全**：腾讯云会自动签发 HTTPS 证书，首次绑定后等几分钟即可。
- **改了 DNS 后迟迟不生效**：本地 DNS 缓存，命令行执行 `ipconfig /flushdns` 刷新，或用手机流量试。

---

## 验证清单（部署完成后自己核对）
- [ ] 默认域名打开，源码里 `app.js?v=21`
- [ ] 用 `admin / Zg@2026!` 能登录
- [ ] 随便点一个按钮（如"新增角色"）弹出真实二级弹窗（不是 alert 占位）
- [ ] CHUANFA.ASIA 打开同款登录页，能正常登录

> 备注：早期我尝试用命令行工具 `tcb` 直接部署，但该环境是 CloudBase Run 容器，
> 需要本地 Docker 构建镜像，而本机无 Docker，故改为「GitHub 中转 + 控制台部署」这条你熟悉且最稳的路。
> 控制台部署方式与历史做法一致（之前也是推 GitHub 后在腾讯云拉取部署）。
