<!--
Sync Impact Report:
- Version change: Initial → 1.0.0
- Added principles: I. 客户交互汉化, II. 程序稳定性优先
- Added sections: 汉化标准, 质量保证
- Templates requiring updates:
  ✅ .specify/memory/constitution.md (updated)
  ⚠ .specify/templates/plan-template.md (pending review)
  ⚠ .specify/templates/spec-template.md (pending review)
  ⚠ .specify/templates/tasks-template.md (pending review)
  ⚠ .cursor/commands/*.md (pending localization)
- Follow-up TODOs: None
-->

# Spec-Kit 汉化项目宪章

## 核心原则

### I. 客户交互汉化（强制）

所有面向用户的交互界面必须汉化为中文，包括但不限于：
- 命令说明文档（.md 文件中的 description 字段）
- 用户提示信息和错误消息
- 文档模板中的说明文字
- 示例和注释文本

**理由**：提升中文用户的使用体验，降低理解门槛，确保工具的可访问性。

### II. 程序稳定性优先（强制）

在汉化过程中必须确保程序正常运行：
- 技术性标识符（变量名、函数名、文件路径）保持英文
- 命令触发关键字（如 `/speckit.specify`）可保持原样或提供中文别名
- 如果汉化会导致工具功能异常且无法规避，则该部分不进行汉化
- 所有汉化必须经过功能验证

**理由**：确保汉化不影响工具的核心功能，保持系统稳定性和可维护性。

### III. 结构化文档（强制）

汉化后的文档必须保持原有结构：
- 保留所有 Markdown 格式标记
- 保持章节层级和标题结构
- 保留代码块、表格等格式元素
- 维护文档间的引用关系

**理由**：确保文档的可读性和工具的正常解析。

## 汉化标准

### 命令文件汉化规则

1. **YAML 头部**：`description` 字段翻译为中文
2. **章节标题**：翻译为对应的中文标题
3. **说明文字**：所有面向用户的说明文字翻译为中文
4. **技术标识**：保持变量名、路径、命令等技术标识为英文
5. **示例代码**：注释翻译为中文，代码保持原样

### 模板文件汉化规则

1. **占位符**：`[PLACEHOLDER]` 形式的占位符可翻译为 `[中文占位符]`
2. **说明注释**：`<!-- 注释 -->` 中的内容翻译为中文
3. **章节标题**：翻译为中文
4. **示例文本**：翻译为中文

### 不汉化内容

- 文件路径和文件名
- 代码变量名和函数名
- JSON/YAML 的键名
- 命令行参数名称
- Git 相关术语（如 branch、commit）
- 技术术语的标准英文缩写（如 API、CLI、TDD）

## 质量保证

### 验证流程

1. **功能测试**：每次汉化后运行完整工作流验证
2. **格式检查**：确保 Markdown 格式正确
3. **一致性检查**：术语翻译保持一致
4. **文档审查**：检查翻译的准确性和可读性

### 术语对照表

建立标准术语对照表，确保翻译一致性：
- Specification → 规范/规格说明
- Plan → 计划/方案
- Task → 任务
- Implementation → 实现
- Constitution → 宪章/原则
- Feature → 功能
- Requirement → 需求

## 治理

### 修订流程

1. 所有宪章修订必须记录版本变更
2. 重大修改需要更新所有相关模板和文档
3. 汉化工作必须遵循此宪章的所有原则

### 合规性

- 所有 PR 必须验证汉化内容不影响功能
- 必须保持原有的工作流逻辑不变
- 复杂修改需要提供详细的影响分析

**版本**: 1.0.0 | **批准日期**: 2025-10-08 | **最后修订**: 2025-10-08
