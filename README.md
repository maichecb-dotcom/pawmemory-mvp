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

## 说明

当前版本还没有接入真正的 AI API。聊天页使用宠物画像和记忆内容生成模拟回应，适合验证第一版产品体验。

## 正式部署路线

推荐使用：

1. GitHub 保存代码
2. Netlify 连接 GitHub 仓库
3. 每次推送到 `main` 分支后自动部署

Netlify 构建配置已经写在 `netlify.toml` 中。当前项目是静态站点，不需要构建命令，发布目录为项目根目录。
