# PawMemory MVP

一个帮助主人保存宠物记忆，并通过 AI 风格互动进行温柔陪伴的前端 MVP 原型。

线上演示：

https://unrivaled-licorice-4881b7.netlify.app/

## 如何打开

直接双击 `index.html`，或在浏览器里打开这个文件：

`/Users/tianye/Documents/New project/index.html`

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

聊天页已经支持通过 Netlify Functions 调用大模型 API。若线上环境没有配置密钥，或本地直接打开 `index.html`，会自动回退到本地模拟回应，适合继续演示。

## 接入 DeepSeek

推荐 MVP 先用 DeepSeek，成本更友好。先在 DeepSeek 开放平台创建 API key：

https://platform.deepseek.com/api_keys

然后在 Netlify 后台配置环境变量：

1. 打开当前站点
2. 进入 `Site configuration`
3. 找到 `Environment variables`
4. 添加这些变量：
   - Key: `AI_PROVIDER`
   - Value: `deepseek`
   - Key: `DEEPSEEK_API_KEY`
   - Value: 你的 DeepSeek API key
5. 保存后到 `Deploys` 里重新部署一次站点

可选环境变量：

- `DEEPSEEK_MODEL`: 默认是 `deepseek-chat`

不要把 API key 写进前端代码或提交到 GitHub。

## 接入 OpenAI

如果以后要切回 OpenAI，在 Netlify 环境变量中配置：

- `AI_PROVIDER`: `openai`
- `OPENAI_API_KEY`: 你的 OpenAI API key
- `OPENAI_MODEL`: 默认是 `gpt-5.4-mini`

## 正式部署路线

推荐使用：

1. GitHub 保存代码
2. Netlify 连接 GitHub 仓库
3. 每次推送到 `main` 分支后自动部署

Netlify 构建配置已经写在 `netlify.toml` 中。当前项目是静态站点，不需要构建命令，发布目录为项目根目录。
