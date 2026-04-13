# Dog Friendly Map

> 发现布里斯班的宠物友好公园和无绳遛狗区域 — 为狗主人打造的最佳遛狗地点搜索工具。

<p align="center">
  <img src="images/logo.svg" alt="Dog Friendly Map Logo" width="120">
</p>

## 关于项目

**Dog Friendly Map** 是一款交互式 Web 应用，帮助布里斯班的狗主人查找附近的公园、无绳遛狗区域及宠物友好设施。应用从布里斯班市政府开放数据门户实时获取公园数据，并通过 Google Maps 交互地图展示，提供丰富的筛选、引导式搜索和详细的公园信息。

本项目是**昆士兰大学（The University of Queensland）** **DECO1800 — Design Computing Studio 1** 课程的团队作业（2025 年第一学期）。

## 功能特性

### 交互式地图
- 集成 Google Maps，使用自定义标记（绿色 = 无绳区域，红色 = 普通公园，蓝色 = 用户位置）
- 自动检测用户地理位置，无法定位时回退到布里斯班 CBD
- 地址搜索 + 地理编码（自动限定布里斯班范围）
- 一键获取前往任意公园的导航路线

### 智能筛选
- **无绳区域（Off-Leash）** — 查找允许狗狗自由活动的公园
- **围栏（Fencing）** — 筛选全封闭围栏公园，更安全
- **夜间照明（Night Lighting）** — 适合傍晚遛狗的公园
- **小型犬专区（Small Dog Enclosure）** — 小型犬专属活动空间
- **敏捷训练设备（Dog Agility Equipment）** — 配备敏捷训练器材的公园
- 筛选器同时适用于地图视图和列表视图

### 引导式搜索（"帮我找公园"）
逐步引导向导，根据遛狗习惯和狗狗需求自动匹配筛选条件：
- 遛狗时间偏好（白天 / 夜晚）
- 是否需要无绳区域
- 是否需要围栏
- 狗狗体型（大型犬 / 小型犬）
- 是否需要敏捷训练设备

### 公园详情页
- 完整的公园信息：开放时间、遛狗规则、配套设施
- 内嵌 Leaflet/OpenStreetMap 地图预览，精确定位
- 一键跳转 Google Maps 导航
- 收藏公园功能（数据持久化到 localStorage）
- **社区评价系统** — 星级评分、文字评论、图片附件、点赞/删除功能
- 评论按公园隔离，存储在浏览器本地

### 用户档案系统
- 可自定义头像上传、显示名称和用户 ID
- 狗狗信息卡片（名字、品种、年龄、备注）
- 遛狗偏好设置（早晨/傍晚、狗狗体型、经验水平）
- 收藏地点管理，可直接跳转公园详情
- 档案数据通过 localStorage 跨会话持久化
- 用户标签（如"早晨遛狗人"、"小型犬主人"）自动显示在评论中

### 收藏偏好
- 在公园详情页点击星标收藏
- 在首页通过"我的收藏偏好"快速访问所有已收藏公园

## 数据来源

所有公园数据实时来自[布里斯班市政府开放数据门户](https://www.data.brisbane.qld.gov.au/)：

| 数据集 | 说明 |
|--------|------|
| [Park Locations](https://data.brisbane.qld.gov.au/explore/dataset/park-locations/information/) | 布里斯班各区公园位置 |
| [Park Dog Off-Leash Areas](https://data.brisbane.qld.gov.au/explore/dataset/park-dog-off-leash-areas/information/) | 指定无绳遛狗区域 |

数据通过市政府公开 REST API 在运行时获取 — 无需后端服务器。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5、CSS3、原生 JavaScript |
| 地图（主页） | [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript) |
| 地图（详情页） | [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) |
| 图标 | [Font Awesome 6](https://fontawesome.com/) |
| 数据 | Brisbane City Council Open Data REST API |
| 存储 | 浏览器 localStorage（档案、评论、收藏） |
| 设计 | [Figma](https://www.figma.com/)（原始线框图和视觉稿） |

## 项目结构

```
DogFriendlyMap/
├── index.html            # 主应用 — 首页、地图视图、列表视图、弹窗
├── full_details.html      # 公园详情页 — 评论系统 + Leaflet 地图
├── profile.html           # 用户档案管理页
├── script.js              # 核心逻辑 — 地图、筛选、数据获取、页面导航
├── profile.js             # 档案页逻辑 — localStorage 持久化、UI 交互
├── css/
│   ├── styles.css         # 全局样式、响应式设计、所有页面组件
│   └── profile.css        # 档案页专属样式
└── images/
    └── logo.svg           # 应用 Logo（地图钉 + 狗爪）
```

## 快速开始

### 前提条件
- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 无需构建工具、Node.js 或后端服务器

### 本地运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/Kira-Calc/DogFriendlyMap.git
   cd DogFriendlyMap
   ```

2. **启动本地服务器**（API 调用需要）
   ```bash
   # Python 3
   python3 -m http.server 8080

   # 或 Node.js
   npx serve .
   ```

3. **在浏览器中打开**
   ```
   http://localhost:8080
   ```

> **注意：** 应用需要联网才能从布里斯班市政府 API 加载公园数据并渲染 Google Maps。

## 团队成员

本项目由昆士兰大学五名学生共同开发：

- **Xinnuo Li**
- **Wenze Ou**
- **Chengquan Jiang**
- **Anton Wey Lam Lee**
- **Yajie Han**

## 致谢

- [布里斯班市政府](https://www.brisbane.qld.gov.au/) — 公园开放数据集
- [Google Maps Platform](https://developers.google.com/maps) — Maps JavaScript API
- [Leaflet](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/) — 详情页地图
- [Font Awesome](https://fontawesome.com/) — 图标库
- [Anima](https://www.animaapp.com/) — 设计辅助工具和图标集
- [Figma](https://www.figma.com/) — UI/UX 设计工具
- AI 工具（ChatGPT、Codex，OpenAI）用于辅助创意构思、代码简化和问题排查，所有 AI 生成内容均经团队成员审查和修改。

## 许可

本项目为昆士兰大学 DECO1800 课程学术作品，版权归作者所有。
