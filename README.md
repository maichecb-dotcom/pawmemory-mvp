# PawMemory MVP

一个帮助主人保存宠物记忆，并通过 AI 风格互动进行温柔陪伴的前端 MVP 原型。

线上演示：

https://unrivaled-licorice-4881b7.netlify.app/

## 如何打开

直接双击 `index.html`，或在浏览器里打开这个文件：

`/Users/tianye/Documents/New project/index.html`

如果要像正式服务器一样在本地运行：

```bash
npm start
```

然后打开：

```text
http://127.0.0.1:3000
```

## 当前功能

- 首页纪念仪表盘
- 宠物画像编辑
- 上传宠物头像
- 保存宠物记忆
- 模拟 AI 陪伴对话
- 本地相册上传
- 数据保存在浏览器 localStorage
- 首次进入引导
- 记忆编辑与删除
- 纪念资料 JSON 导出
- 隐私说明与情绪边界页面
- AI 回复生成中状态
- AI 回复反馈按钮
- 更完整的宠物画像字段：纪念日期、常待地点、关系故事
- 记忆搜索与类型筛选
- AI 回复重新生成

## 说明

聊天页已经支持通过 Vercel Functions 或 Netlify Functions 调用大模型 API。若线上环境没有配置密钥，或本地直接打开 `index.html`，会自动回退到本地模拟回应，适合继续演示。

## 接入 DeepSeek

推荐 MVP 先用 DeepSeek，成本更友好。先在 DeepSeek 开放平台创建 API key：

https://platform.deepseek.com/api_keys

然后在 Vercel 后台配置环境变量：

1. 打开 Vercel 项目
2. 进入 `Settings`
3. 找到 `Environment Variables`
4. 添加这些变量：
   - Key: `AI_PROVIDER`
   - Value: `deepseek`
   - Key: `DEEPSEEK_API_KEY`
   - Value: 你的 DeepSeek API key
5. 保存后到 `Deployments` 里重新部署一次站点

可选环境变量：

- `DEEPSEEK_MODEL`: 默认是 `deepseek-chat`

不要把 API key 写进前端代码或提交到 GitHub。

## 接入 OpenAI

如果以后要切回 OpenAI，在 Vercel 环境变量中配置：

- `AI_PROVIDER`: `openai`
- `OPENAI_API_KEY`: 你的 OpenAI API key
- `OPENAI_MODEL`: 默认是 `gpt-5.4-mini`

## 用 Vercel 部署

当前项目已经兼容 Vercel：

1. 打开 https://vercel.com
2. 用 GitHub 登录
3. 点击 `Add New...` -> `Project`
4. 找到 GitHub 仓库 `pawmemory-mvp`
5. 点击 `Import`
6. Framework Preset 选择 `Other`
7. Build Command 留空
8. Output Directory 留空或保持默认
9. Root Directory 保持项目根目录
10. 展开 `Environment Variables`
11. 添加：
    - `AI_PROVIDER` = `deepseek`
    - `DEEPSEEK_API_KEY` = 你的 DeepSeek API key
12. 点击 `Deploy`

部署成功后，Vercel 会给你一个 `*.vercel.app` 链接。以后每次推送到 GitHub 的 `main` 分支，Vercel 会自动重新部署。

AI 接口在 Vercel 上的路径是：

`/api/chat`

## 腾讯云服务器部署准备

项目已经新增普通 Node 服务器入口，方便后续迁移到腾讯云轻量应用服务器：

- `server.js`：同时提供静态页面和 `/api/chat`、`/api/profile`、`/api/config`
- `package.json`：包含 `npm start` 和 `npm run check`
- `.env.example`：服务器环境变量模板
- `TENCENT_CLOUD_MIGRATION.md`：小白版迁移准备清单

第一阶段迁移建议仍然临时使用 Supabase 做登录和云端资料，只把前端和 API 先放到腾讯云，降低一次性迁移风险。

## 登录与云端同步

当前项目已经预留 Supabase 登录和云端同步。第一版云端会把整份 App 数据保存为一个 JSON 档案，包含宠物画像、记忆、相册元数据、聊天记录和反馈按钮记录。

配置步骤：

1. 打开 https://supabase.com
2. 创建一个新项目
3. 进入 `SQL Editor`
4. 复制并运行 `supabase/schema.sql`
5. 进入 `Project Settings` -> `API`
6. 复制：
   - `Project URL`
   - `anon public key`
7. 打开 Vercel 项目
8. 进入 `Settings` -> `Environment Variables`
9. 添加：
   - `SUPABASE_URL` = Supabase Project URL
   - `SUPABASE_ANON_KEY` = Supabase anon public key
10. 保存后重新部署

本地直接打开 `index.html` 时仍然是本地预览模式，不会连接云端。

## 收集用户试用反馈

当前项目在 `安心` 页面放了一个问卷星入口。用户完成试用后点击 `填写试用反馈问卷`，会跳转到问卷星：

https://v.wjx.cn/vm/Q0eFAG1.aspx

反馈结果在问卷星后台查看，不需要额外配置 Vercel 环境变量。

## Netlify 旧部署

项目里仍保留 `netlify.toml` 和 `netlify/functions/chat.js`，方便旧 Netlify 站点继续使用。但如果 Netlify 没有额度，推荐改用 Vercel。
