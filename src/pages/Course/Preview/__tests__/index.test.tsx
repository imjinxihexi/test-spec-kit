describe('PreviewHeader', () => {
  test('组件导出正常', () => {
    const PreviewHeader = require('../components/PreviewHeader/index').default;
    expect(PreviewHeader).toBeDefined();
    expect(typeof PreviewHeader).toBe('function');
  });
});

describe('ChapterTree', () => {
  test('组件导出正常', () => {
    const ChapterTree = require('../components/ChapterTree/index').default;
    expect(ChapterTree).toBeDefined();
    expect(typeof ChapterTree).toBe('function');
  });
});

export {};
