# 分类管理模块

## 功能概述

分类管理模块支持4层级（Level 1/2/3/4）的树形分类结构，提供完整的CRUD操作和搜索功能。

## 技术栈

- **xui-pro**: CURD（列表）、ModalForm（弹窗）
- **antd**: Tree（分类树）、TreeSelect（上级分类选择）
- **状态管理**: useReducer + Context
- **HTTP**: window.ajax

## 文件结构

```
src/pages/Category/Management/
├── index.tsx                # 页面入口，Context Provider
├── index.module.less        # 页面样式
├── store.ts                 # 状态定义和 reducer
├── context.ts               # Context 定义
├── components/              # 子组件
│   ├── index.ts            # 组件导出
│   ├── CategoryTree/       # 分类树组件（antd Tree）
│   │   ├── index.tsx
│   │   └── index.module.less
│   ├── CategoryList/       # 分类列表组件（xui-pro CURD）
│   │   ├── index.tsx
│   │   └── index.module.less
│   └── CategoryModal/      # 新增/编辑弹窗（xui-pro ModalForm）
│       ├── index.tsx
│       └── index.module.less
└── README.md               # 本文档
```

## API 接口

所有接口定义和类型在 `src/api/xp-iphoenix-qadmin-boot/category/index.ts`

- `getCategoryTree`: 获取分类树
- `queryCategoryList`: 查询分类列表（支持分页、搜索）
- `createCategory`: 新增分类
- `updateCategory`: 编辑分类
- `deleteCategory`: 删除分类

## 核心功能

### 1. 分类树（antd Tree）

- 支持虚拟【全部】节点，默认选中显示所有分类
- 树形展示4层级结构，默认不展开
- 点击节点查看该节点的所有子孙分类

### 2. 分类列表（xui-pro CURD）

- 使用 xui-pro CURD 组件，集成表格和分页
- 列：分类名称、层级、上级分类、课程数、创建时间、创建人、更新时间、操作人
- 支持分页（默认20条/页）
- 按更新时间降序排列

### 3. 搜索功能

- 基于当前选中分类范围搜索
- 支持分类名称模糊查询
- 点击树节点自动清空搜索

### 4. 新增分类（xui-pro ModalForm）

- 页面顶部【Add】按钮：可选择上级分类（Level 1/2/3）
- 列表【Add Child】按钮：上级分类自动填充且只读
- Level 4 不显示【Add Child】按钮
- 同层级名称唯一性校验

### 5. 编辑分类（xui-pro ModalForm）

- 只能修改分类名称
- 上级分类只读显示

### 6. 删除分类

- 课程数 > 0 的分类不显示【Delete】按钮
- 二次确认删除
- 后端校验子分类限制

## 状态管理

使用 `useReducer + Context` 管理页面状态：

- `selectedTreeNodeId`: 选中的树节点 ID
- `treeData`: 分类树数据
- `searchKeyword`: 搜索关键词
- `modalVisible`: 弹窗显示状态
- `modalMode`: 弹窗模式（add/edit/addChild）

## 开发规范

- API 定义和类型在同一文件 `src/api/xp-iphoenix-qadmin-boot/category/index.ts`
- 使用 `window.ajax` 发送请求
- 优先使用 `xui-pro` 组件（CURD、ModalForm）
- Tree 使用 `antd` 组件（xui-pro 无此组件）
- 使用 `@/` 别名导入跨模块内容
- 组件文件使用 `PascalCase`
- 禁止使用 `any` 类型
