# 项目结构说明

## 📁 目录组织

```
cocktail-merge/
├── src/
│   ├── components/
│   │   └── CocktailGame.tsx     # 主游戏组件（物理引擎驱动）
│   ├── assets/                   # 资源文件夹（预留）
│   │   ├── backgrounds/          # 背景资源
│   │   └── items/               # 物品资源
│   ├── App.tsx                   # 应用入口组件
│   ├── main.tsx                  # 应用启动文件
│   └── index.css                 # 全局样式
├── public/
│   └── item/                    # 游戏资源（ice_1到ice_5 PNG图片）
│       ├── ice_1.png
│       ├── ice_2.png
│       ├── ice_3.png
│       ├── ice_4.png
│       └── ice_5.png
├── index.html                    # HTML 入口文件
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
├── package.json                 # 项目依赖配置
└── legacy-assets/               # 历史资源备份
    └── item/                    # 原始物品图片

```

## 🎮 项目说明

这是一个使用 **React + TypeScript + Vite** 开发的互动游戏应用。

### 核心技术：
- **物理引擎**: Matter.js（物体碰撞、合成、重力）
- **渲染**: HTML5 Canvas（2D 绘制）
- **图片资源**: PNG 图片（ice_1 ～ ice_5）
- **UI**: Lucide React icons + Tailwind CSS

### 游戏特性：
✅ 基于物理的交互式游戏  
✅ 5个等级的冰块升级系统（ice_1 ～ ice_5）  
✅ 物体碰撞检测和合成机制  
✅ 分数系统  
✅ 游戏开始/结束状态管理  

## 🚀 快速开始

### 已安装项目依赖（294 个包）
### 开发服务器已启动
- **地址**: http://localhost:3000
- **热刷新**: 修改代码后自动更新

### 可用命令：
```bash
npm run dev      # 启动开发服务器（已运行）
npm run build    # 构建生产版本
npm run preview  # 预览生产版本
npm run lint     # TypeScript 类型检查
npm run clean    # 清除 dist 目录
```

## 📝 代码组织

### 主要组件

#### CocktailGame.tsx (670 行)
- 物理引擎初始化和管理
- Canvas 渲染循环
- 碰撞检测和物体合成逻辑
- 触摸/鼠标交互处理
- 游戏状态管理

#### 游戏配置常量
- `DRINK_LEVELS`: 5 个等级的冰块定义（ice_1 ～ ice_5，包含图片路径、颜色、半径）
- `CANVAS_WIDTH/HEIGHT`: 400x600 像素
- `DANGER_LINE_Y`: 危险线位置（480px）
- `TABLE_TOP_Y`: 桌面顶部位置（120px）

## 🎨 资源说明

### 当前使用
- **图片资源**: 5 个PNG图片（ice_1到ice_5）位于 `public/item/` 目录
- **Canvas 绘制**: 背景由Canvas动态绘制，游戏物体使用预加载的PNG图片

### 旧资源（已备份到 legacy-assets）
- `drawBackground/table.png` - 桌子背景图（已不使用）
- `item/ice_*.png` - 原始冰块图片（已复制到 public/item）

## ⚙️ 配置文件

- `vite.config.ts` - Vite 打包工具配置
- `tsconfig.json` - TypeScript 编译选项
- `project.config.json` - 项目元数据
- `.gitignore` - Git 忽略规则

## 📊 依赖说明

### 核心依赖
- `react@19.0.0` - UI 框架
- `matter-js@0.20.0` - 2D 物理引擎
- `vite@6.2.0` - 开发工具
- `tailwindcss@4.1.14` - 样式框架
- `lucide-react@0.546.0` - 图标库

## 🔧 开发建议

1. **代码修改**: 修改 `src/components/CocktailGame.tsx` 中的游戏逻辑
2. **样式修改**: 编辑 `src/index.css` 或使用 Tailwind classes
3. **新组件**: 在 `src/components/` 目录下创建
4. **资源添加**: 使用 `src/assets/` 文件夹组织

---

**状态**: ✅ 开发服务器运行中 | 依赖已安装 | 项目已文档化
