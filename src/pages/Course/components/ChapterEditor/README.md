# ChapterEditor 组件

章节编辑弹窗组件，支持章节的增删改查和拖拽排序。

## 功能特性

- ✅ 章节列表展示
- ✅ 拖拽排序
- ✅ 添加/删除章节
- ✅ 实时名称校验
- ✅ 状态感知删除确认

## 使用示例

```typescript
import { useState } from 'react';
import { Button } from 'antd';
import { ChapterEditor, Chapter } from '@/pages/Course/components';

function CoursePage() {
  const [visible, setVisible] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: 1, name: '第一章', sort: 1 },
    { id: 2, name: '第二章', sort: 2 },
  ]);

  const handleChapterChange = (newChapters: Chapter[]) => {
    setChapters(newChapters);
    setVisible(false);
    // 可以在这里调用 API 保存到后端
  };

  return (
    <>
      <Button onClick={() => setVisible(true)}>
        Edit Chapters
      </Button>

      <ChapterEditor
        visible={visible}
        value={chapters}
        courseStatus="published"
        onChange={handleChapterChange}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
```

## Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| visible | boolean | 是 | - | 是否显示弹窗 |
| value | Chapter[] | 是 | - | 章节列表 |
| courseStatus | 'published' \| 'hidden' \| 'disabled' | 否 | - | 课程状态，影响删除提示文案 |
| onChange | (chapters: Chapter[]) => void | 是 | - | 章节变更回调 |
| onClose | () => void | 是 | - | 关闭弹窗回调 |

## Chapter 类型

```typescript
interface Chapter {
  id?: number;        // 章节ID，新增时不传
  name: string;       // 章节名称，1-100字符
  sort: number;       // 排序号，从1开始
  tempId?: string;    // 临时ID，用于新增章节
}
```

## 校验规则

- 章节名称：1-100 字符
- 不能为空
- 同一课程下不能重复

## 删除逻辑

| 场景 | 处理方式 |
|------|---------|
| 新增未保存（只有 tempId） | 直接删除，无需确认 |
| 已保存 + 公开发布状态 | 弹窗确认："章节变更将影响学员学习进度，是否确认？" |
| 已保存 + 其他状态 | 弹窗确认："删除后该章节下所有课件将被移除，是否确认？" |

## 注意事项

1. 组件采用受控模式，内部维护临时编辑状态
2. 只在点击 Confirm 时才调用 onChange
3. 点击 Cancel 或关闭弹窗会丢弃所有未保存的修改
4. 拖拽排序后会自动重新计算 sort 字段（1, 2, 3...）
5. 组件不直接调用 API，由父组件负责数据持久化
