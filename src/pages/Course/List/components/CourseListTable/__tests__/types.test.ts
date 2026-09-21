import type { CourseListTableProps } from '../types';

describe('CourseListTable Types', () => {
  test('应该正确定义 CourseListTableProps', () => {
    const props: CourseListTableProps = {
      selectedCategoryId: 'all',
      onRefresh: () => {}
    };

    expect(props.selectedCategoryId).toBe('all');
    expect(typeof props.onRefresh).toBe('function');
  });

  test('selectedCategoryId 可以是数字', () => {
    const props: CourseListTableProps = {
      selectedCategoryId: 123
    };

    expect(props.selectedCategoryId).toBe(123);
  });

  test('所有属性都是可选的', () => {
    const props: CourseListTableProps = {};

    expect(props.selectedCategoryId).toBeUndefined();
    expect(props.onRefresh).toBeUndefined();
  });
});
