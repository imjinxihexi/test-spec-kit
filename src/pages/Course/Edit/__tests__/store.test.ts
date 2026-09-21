import { reducer, initialState, type CoursePageState, type ACTIONTYPE } from '../store';

describe('CoursePage Reducer', () => {
  describe('初始状态', () => {
    test('初始状态应该正确', () => {
      expect(initialState.mode).toBe('create');
      expect(initialState.basicInfo.hasChapter).toBe(false);
      expect(initialState.chapters).toHaveLength(0);
      expect(initialState.coursewares).toHaveLength(0);
    });
  });

  describe('INIT_PAGE', () => {
    test('再次进入新建页应该清空上次填写的课程数据并保留传入分类', () => {
      const state: CoursePageState = {
        ...initialState,
        mode: 'edit',
        courseCode: 100,
        basicInfo: {
          ...initialState.basicInfo,
          name: '上次新增课程',
          categoryId: 1,
          hasChapter: true,
          lang: 'zh_CN',
          introduction: '上次填写的简介',
          coverUrl: 'custom-cover.png',
        },
        chapters: [{ id: 1, name: '旧章节', sort: 1 }],
        coursewares: [
          {
            coursewareCode: 1,
            coursewareName: '旧课件',
            duration: 60,
            chapterId: 1,
            sort: 1,
          },
        ],
        ui: {
          ...initialState.ui,
          chapterEditorVisible: true,
          coursewareSelectorVisible: true,
          selectedChapterId: 1,
          systemCovers: ['old-cover.png'],
          loading: true,
        },
      };

      const newState = reducer(state, {
        type: 'INIT_PAGE',
        payload: { mode: 'create', categoryId: 2 },
      });

      expect(newState).toEqual({
        ...initialState,
        basicInfo: {
          ...initialState.basicInfo,
          categoryId: 2,
        },
      });
    });

    test('未传分类时应该清除上次选择的分类', () => {
      const state: CoursePageState = {
        ...initialState,
        basicInfo: {
          ...initialState.basicInfo,
          categoryId: 1,
        },
      };

      const newState = reducer(state, {
        type: 'INIT_PAGE',
        payload: { mode: 'create' },
      });

      expect(newState.basicInfo.categoryId).toBeUndefined();
    });
  });

  describe('TOGGLE_HAS_CHAPTER', () => {
    test('从"不区分"切换到"区分"应该创建章节1并移入所有课件', () => {
      const state: CoursePageState = {
        ...initialState,
        basicInfo: {
          ...initialState.basicInfo,
          hasChapter: false,
        },
        coursewares: [
          {
            coursewareCode: '1',
            coursewareName: '课件1',
            duration: 60,
            sort: 1,
          },
          {
            coursewareCode: '2',
            coursewareName: '课件2',
            duration: 120,
            sort: 2,
          },
        ],
      };

      const action: ACTIONTYPE = { type: 'TOGGLE_HAS_CHAPTER', payload: true };
      const newState = reducer(state, action);

      expect(newState.basicInfo.hasChapter).toBe(true);
      expect(newState.chapters).toHaveLength(1);
      expect(newState.chapters[0].name).toBe('章节1');
      expect(newState.chapters[0].sort).toBe(1);
      expect(newState.coursewares[0].chapterId).toBeDefined();
      expect(newState.coursewares[1].chapterId).toBeDefined();
      expect(newState.coursewares[0].chapterId).toBe(newState.coursewares[1].chapterId);
    });

    test('从"区分"切换到"不区分"应该删除章节并平铺课件', () => {
      const state: CoursePageState = {
        ...initialState,
        basicInfo: {
          ...initialState.basicInfo,
          hasChapter: true,
          studyMode: 1,
        },
        chapters: [
          { id: 1, name: '章节1', sort: 1 },
          { id: 2, name: '章节2', sort: 2 },
        ],
        coursewares: [
          {
            coursewareCode: '1',
            coursewareName: '课件1',
            duration: 60,
            chapterId: 1,
            sort: 1,
          },
          {
            coursewareCode: '2',
            coursewareName: '课件2',
            duration: 120,
            chapterId: 2,
            sort: 1,
          },
        ],
      };

      const action: ACTIONTYPE = { type: 'TOGGLE_HAS_CHAPTER', payload: false };
      const newState = reducer(state, action);

      expect(newState.basicInfo.hasChapter).toBe(false);
      expect(newState.basicInfo.studyMode).toBe(2);
      expect(newState.chapters).toHaveLength(0);
      expect(newState.coursewares[0].chapterId).toBeUndefined();
      expect(newState.coursewares[1].chapterId).toBeUndefined();
      expect(newState.coursewares[0].sort).toBe(1);
      expect(newState.coursewares[1].sort).toBe(2);
    });
  });

  describe('DELETE_COURSEWARE', () => {
    test('删除课件后应该重新计算sort', () => {
      const state: CoursePageState = {
        ...initialState,
        coursewares: [
          {
            coursewareCode: '1',
            coursewareName: '课件1',
            duration: 60,
            sort: 1,
          },
          {
            coursewareCode: '2',
            coursewareName: '课件2',
            duration: 120,
            sort: 2,
          },
          {
            coursewareCode: '3',
            coursewareName: '课件3',
            duration: 180,
            sort: 3,
          },
        ],
      };

      const action: ACTIONTYPE = { type: 'DELETE_COURSEWARE', payload: '2' };
      const newState = reducer(state, action);

      expect(newState.coursewares).toHaveLength(2);
      expect(newState.coursewares[0].coursewareCode).toBe('1');
      expect(newState.coursewares[0].sort).toBe(1);
      expect(newState.coursewares[1].coursewareCode).toBe('3');
      expect(newState.coursewares[1].sort).toBe(2);
    });
  });

  describe('UPDATE_CHAPTERS', () => {
    test('删除章节应该清理课件的 chapterId', () => {
      const state: CoursePageState = {
        ...initialState,
        chapters: [
          { id: 1, name: '章节1', sort: 1 },
          { id: 2, name: '章节2', sort: 2 },
        ],
        coursewares: [
          {
            coursewareCode: '1',
            coursewareName: '课件1',
            duration: 60,
            chapterId: 1,
            sort: 1,
          },
          {
            coursewareCode: '2',
            coursewareName: '课件2',
            duration: 120,
            chapterId: 2,
            sort: 1,
          },
        ],
      };

      // 删除章节2
      const action: ACTIONTYPE = {
        type: 'UPDATE_CHAPTERS',
        payload: [{ id: 1, name: '章节1', sort: 1 }],
      };
      const newState = reducer(state, action);

      expect(newState.chapters).toHaveLength(1);
      expect(newState.coursewares[0].chapterId).toBe(1);
      expect(newState.coursewares[1].chapterId).toBeUndefined();
    });
  });
});
