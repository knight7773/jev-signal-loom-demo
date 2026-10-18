# JEV / Signal Loom

React、Vite、Three.js 交互式前端 Demo，包含三维信号矩阵、六个判断案例，以及 15 家 DEX 的公开安全范围看板。

## 本地运行

需要 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
```

## 验证与构建

```sh
npm run test:sites
npm run build
npm run preview
```

静态构建输出在 `dist/client`。保留 Sites 构建适配文件，但不包含部署凭证或自动部署配置。

## 功能边界

- 粒子、曲线、吞吐和演示概率是合成数据。
- SECURITY 看板含 15 家平台；7 家公开计划已查阅，8 家待核验，记录日期为 2026-10-18。官方政策可能变化。
- 未开展 DEX 越权测试，未注册账户，不提供漏洞结论。
- 本仓库仅发布前端，不包含 Python 后端、API Key、环境文件或用户录像。
- 真实 Jev 调用需要另外提供 `/api/health`、`/api/evaluate` 和 `/api/security/review` 服务。开发代理默认指向 `127.0.0.1:4187`；静态托管本身不提供这些接口。无后端时会显示不可用，不会伪造结果。
- API Key 只能配置在服务端，不可使用 Vite 公共环境变量暴露给浏览器。

参考项目：[jevframe](https://github.com/ktaletsk/jevframe)、[jev4pg](https://github.com/Sheltercosmo/jev4pg)、[duckdb-jev](https://github.com/prasanthj/duckdb-jev)。
