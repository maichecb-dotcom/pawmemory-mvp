# PawMemory 腾讯云迁移准备清单

这份清单给明天迁移用。先做第一阶段：把当前 Web App 和 Node API 跑到腾讯云轻量应用服务器上。数据库暂时仍用 Supabase，等访问稳定后再迁腾讯云数据库。

## 你明天需要准备

1. 腾讯云服务器
   - 服务器公网 IP
   - 登录方式：SSH 密码或密钥
   - 系统用户：通常是 `root` 或腾讯云控制台显示的默认用户
   - 确认防火墙/安全组放行：`80`、`443`、临时测试端口 `3000`

2. 域名
   - 一个准备给 PawMemory 用的域名，例如 `pawmemory.cn`
   - 域名是否已备案。如果还没备案，先可以用服务器 IP 测试，正式给大陆用户访问需要备案
   - 域名 DNS 管理入口

3. 环境变量
   - `DEEPSEEK_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - 这些值不要发在聊天里。明天我告诉你填到服务器的 `.env` 文件里

4. GitHub
   - 确认 GitHub Desktop 已经能 push
   - 腾讯云服务器上如果要直接拉代码，需要 GitHub 仓库可访问；如果拉不动，可以用压缩包上传

5. Supabase
   - 已创建 `reply_feedback` 表
   - 先不要关闭 Supabase。第一阶段还会继续用它做登录和云端资料

## 我已经为迁移准备好的代码

项目现在新增了：

- `server.js`：腾讯云普通 Node 服务入口
- `package.json`：启动命令和检查命令
- `.env.example`：服务器环境变量模板

明天服务器上大概会执行：

```bash
cd /path/to/pawmemory-mvp
cp .env.example .env
npm start
```

如果测试没问题，再用 `pm2` 常驻运行：

```bash
npm install -g pm2
pm2 start server.js --name pawmemory
pm2 save
```

## 第一阶段迁移目标

迁完后结构是：

```text
大陆用户 -> 腾讯云服务器 -> DeepSeek / Supabase
```

这一步先解决大陆访问 Vercel 不稳定的问题。

## 后续阶段

第二阶段：
- 把 Supabase 的用户资料、记忆、聊天记录、反馈表迁到腾讯云数据库

第三阶段：
- 把宠物头像、相册、记忆照片迁到腾讯云 COS

第四阶段：
- 绑定正式域名、HTTPS、ICP备案、App 上架材料

## 明天你不用提前做的事

- 不用现在买数据库
- 不用现在开 COS
- 不用现在改域名解析
- 不用把腾讯云账号密码发给我

我们先把服务器跑通，再逐步迁。
