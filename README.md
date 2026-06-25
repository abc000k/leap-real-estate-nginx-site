# 立璞房产咨询有限公司官网

一个纯 HTML + CSS + JavaScript 的公司展示官网，用 Nginx 提供静态文件服务，并将 `/api/city` 反向代理到 Open-Meteo，将 `/api/news` 反向代理到 HN Algolia 新闻搜索 API。

## 功能

- LEAP 粉色视觉 Hero、Slogan 打字机效果、三项服务卡片、团队与联系方式。
- 纯 JavaScript 明暗主题切换、服务详情弹窗、上海城市天气数据和城市地产新闻展示。
- Nginx 静态资源服务、`/api` 反向代理、404 页面、自签名 HTTPS、静态资源缓存头。

## 启动

复制下面命令即可运行：

```bash
docker compose up --build
```

打开：

- HTTP: http://localhost:8080
- HTTPS: https://localhost:8443

浏览器会提示自签名证书不受信任，选择继续访问即可用于本地验收。

## 验证

运行自动检查：

```bash
npm test
```

检查 Nginx 配置语法：

```bash
docker compose run --rm web nginx -t
```

访问反向代理示例：

```bash
curl "http://localhost:8080/api/city/forecast?latitude=31.2304&longitude=121.4737&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FShanghai"
curl "http://localhost:8080/api/news/search?query=commercial%20real%20estate&tags=story&hitsPerPage=3"
```

访问 404 页面：

```bash
curl -i http://localhost:8080/not-found
```

## GitHub 公开仓库

如果本机已登录 GitHub CLI，可用下面命令创建公开仓库并推送：

```bash
git add .
git commit -m "Build LEAP real estate Nginx website"
gh repo create leap-real-estate-nginx-site --public --source=. --remote=origin --push
```

## AI 辅助说明

本项目使用 ChatGPT/Codex 辅助生成页面结构、交互脚本、视觉资产提示词和 Nginx 配置。
