# Meme - 表情包选择器

一个网页版表情包选择器，支持浏览、搜索、收藏和上传自定义表情包。可在飞书客户端中通过网页应用方式使用，也可独立部署。

## 功能

- 表情网格展示，支持分类筛选
- 关键词搜索
- 收藏表情
- 上传自定义表情
- 点击复制到剪贴板，直接粘贴到聊天
- 局域网内其他设备可访问

## 技术栈

- **前端**: HTML / CSS / JavaScript（无框架）
- **后端**: Node.js + Express
- **数据库**: SQLite（better-sqlite3）
- **飞书集成**: H5 JSAPI（可选）

## 快速开始

### 前置要求

- Node.js 18+
- npm

### 安装

```bash
git clone git@github.com:Wangtaotaoo/Meme.git
cd Meme
npm install
```

### 启动

```bash
npm start
```

启动后会打印访问地址：

```
Server running at:
  Local:   http://localhost:3000
  Network: http://192.168.x.x:3000
```

- `http://localhost:3000` — 本机访问
- `http://192.168.x.x:3000` — 局域网其他设备访问

### 指定端口

```bash
PORT=8080 npm start
```

### 开发模式（文件改动自动重启）

```bash
npm run dev
```

## 项目结构

```
├── server/                  # 后端
│   ├── index.js             # Express 入口
│   ├── config.js            # 配置
│   ├── routes/              # API 路由
│   ├── services/            # 飞书鉴权等服务
│   └── db/                  # 数据库初始化与连接
├── public/                  # 前端静态文件
│   ├── index.html           # 页面入口
│   ├── css/                 # 样式
│   ├── js/                  # 前端逻辑
│   │   ├── components/      # UI 组件
│   │   └── utils/           # 工具函数
│   └── assets/
│       └── emoji-defaults/  # 内置表情包图片
├── data/
│   └── emojis.db            # SQLite 数据库（含初始数据）
└── scripts/                 # 数据脚本
    ├── seed.js              # 初始化分类和占位数据
    └── download-*.js        # 下载表情包的脚本
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/emojis?category=&search=&page=&limit=` | 表情列表 |
| GET | `/api/categories` | 分类列表 |
| POST | `/api/favorites` | 添加收藏 |
| DELETE | `/api/favorites/:emoji_id?user_id=` | 取消收藏 |
| POST | `/api/upload/emoji` | 上传表情图片 |

## 飞书集成（可选）

如需在飞书客户端中使用完整功能（免登、发送到聊天），需：

1. 在 [open.feishu.cn](https://open.feishu.cn) 创建企业自建应用
2. 启用「网页应用」能力
3. 创建 `.env` 文件：

```
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
```

不走飞书集成也可以正常使用表情包浏览、搜索、复制功能。
