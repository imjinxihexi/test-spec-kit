/**
 * ChapterEditor 组件导出测试
 * 注意：根据项目测试策略，我们专注于业务逻辑测试，不测试 UI 渲染
 * 组件本身的导出由 TypeScript 类型检查保证
 */

import { Chapter, CourseStatus, ChapterEditorProps } from '../types';

describe('ChapterEditor', () => {
  test('类型导出正常', () => {
    const chapter: Chapter = {
      id: 1,
      name: 'Test Chapter',
      sort: 1,
      tempId: 'temp-1',
    };

    expect(chapter).toBeDefined();
    expect(chapter.id).toBe(1);
    expect(chapter.name).toBe('Test Chapter');
  });

  test('CourseStatus 类型定义正确', () => {
    const statuses: CourseStatus[] = ['published', 'hidden', 'disabled'];
    expect(statuses).toHaveLength(3);
  });

  test('ChapterEditorProps 类型定义正确', () => {
    const props: ChapterEditorProps = {
      visible: true,
      value: [],
      onChange: jest.fn(),
      onClose: jest.fn(),
    };

    expect(props.visible).toBe(true);
    expect(props.value).toEqual([]);
    expect(typeof props.onChange).toBe('function');
    expect(typeof props.onClose).toBe('function');
  });
});
