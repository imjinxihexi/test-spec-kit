import { reducer, initialState } from '../store';
import type { CourseDetailResp } from '@/api/xp-evi-learning-admin-eu-boot/course';
import type { LearnerCourseDetailResp } from '@/api/xp-evi-learning-student-eu-boot/course';
import type { PreviewState } from '../store';

describe('PreviewState - Reducer', () => {
  test('SET_LOADING 应该更新 loading 状态', () => {
    const newState = reducer(initialState, {
      type: 'SET_LOADING',
      payload: true,
    });

    expect(newState.loading).toBe(true);
  });

  test('INIT_COURSE 应该初始化课程并选中第一个课件', () => {
    const courseData: CourseDetailResp = {
      id: 1,
      name: 'Test Course',
      categoryId: 1,
      studyMode: 1,
      hasChapter: true,
      introduction: '',
      coverUrl: '',
      isHidden: false,
      labels: [],
      lang: 'en',
      chapters: [
        {
          id: 1,
          name: 'Chapter 1',
          sort: 1,
          contents: [
            {
              id: 1,
              coursewareCode: 100,
              coursewareName: 'Doc1',
              duration: 300,
              fileType: 'pdf',
              sort: 1,
            },
          ],
        },
      ],
      coursewareContents: [],
    };

    const newState = reducer(initialState, {
      type: 'INIT_COURSE',
      payload: courseData,
    });

    expect(newState.courseName).toBe('Test Course');
    expect(newState.studyMode).toBe(1);
    expect(newState.selectedCoursewareCode).toBe(100);
    expect(newState.totalDuration).toBe(300);
    expect(newState.chapters).toHaveLength(1);
  });

  test('INIT_COURSE 应该计算总时长', () => {
    const courseData: CourseDetailResp = {
      id: 1,
      name: 'Test Course',
      categoryId: 1,
      studyMode: 1,
      hasChapter: true,
      introduction: '',
      coverUrl: '',
      isHidden: false,
      labels: [],
      lang: 'en',
      chapters: [
        {
          id: 1,
          name: 'Chapter 1',
          sort: 1,
          contents: [
            {
              id: 1,
              coursewareCode: 100,
              sort: 1,
              coursewareName: 'Doc1',
              duration: 300,
              fileType: 'pdf',
            },
            {
              id: 2,
              coursewareCode: 101,
              sort: 2,
              coursewareName: 'Doc2',
              duration: 200,
              fileType: 'pdf',
            },
          ],
        },
        {
          id: 2,
          name: 'Chapter 2',
          sort: 2,
          contents: [
            {
              id: 3,
              coursewareCode: 102,
              sort: 1,
              coursewareName: 'Doc3',
              duration: 100,
              fileType: 'pdf',
            },
          ],
        },
      ],
      coursewareContents: [],
    };

    const newState = reducer(initialState, {
      type: 'INIT_COURSE',
      payload: courseData,
    });

    expect(newState.totalDuration).toBe(600);
  });

  test('SELECT_COURSEWARE 应该更新选中的课件', () => {
    const state = { ...initialState, selectedCoursewareCode: 100 };
    const newState = reducer(state, {
      type: 'SELECT_COURSEWARE',
      payload: 200,
    });

    expect(newState.selectedCoursewareCode).toBe(200);
  });

  test('INIT_COURSE 章节为空时应该返回 null selectedCoursewareCode', () => {
    const courseData: CourseDetailResp = {
      id: 1,
      name: 'Empty Course',
      categoryId: 1,
      studyMode: 1,
      hasChapter: false,
      introduction: '',
      coverUrl: '',
      isHidden: false,
      labels: [],
      lang: 'en',
      chapters: [],
      coursewareContents: [],
    };

    const newState = reducer(initialState, {
      type: 'INIT_COURSE',
      payload: courseData,
    });

    expect(newState.selectedCoursewareCode).toBeNull();
    expect(newState.totalDuration).toBe(0);
  });

  test('INIT_STUDY_COURSE 应该初始化学员端课程数据', () => {
    const studyData: LearnerCourseDetailResp = {
      name: 'Study Course',
      duration: 600,
      progress: 30,
      studyMode: 1,
      learningCoursewareChapters: [
        {
          chapterName: 'Chapter 1',
          chapterId: 1,
          coursewares: [
            { coursewareCode: 100, name: 'Doc1', fileKey: 'k1', fileSize: 1024, duration: 300, watchDuration: 100, progress: 50 },
            { coursewareCode: 101, name: 'Doc2', fileKey: 'k2', fileSize: 2048, duration: 300, watchDuration: 300, progress: 100 },
          ],
        },
        {
          chapterName: 'Chapter 2',
          chapterId: 2,
          coursewares: [
            { coursewareCode: 102, name: 'Doc3', fileKey: 'k3', fileSize: 512, duration: 100, watchDuration: 0, progress: 0 },
          ],
        },
      ],
    };

    const newState = reducer(
      { ...initialState, mode: 'study' as const },
      { type: 'INIT_STUDY_COURSE', payload: studyData }
    );

    expect(newState.courseName).toBe('Study Course');
    expect(newState.courseProgress).toBe(30);
    expect(newState.chapters).toHaveLength(2);
    expect(newState.selectedCoursewareCode).toBe(100);
    expect(newState.coursewareProgressMap.get(100)?.progress).toBe(50);
    expect(newState.coursewareProgressMap.get(101)?.isCompleted).toBe(true);
    expect(newState.chapterLockMap.get(1)?.locked).toBe(false);
    expect(newState.chapterLockMap.get(2)?.locked).toBe(true);
  });

  test('UPDATE_COURSEWARE_PROGRESS 应该更新课件进度并重算锁定', () => {
    const state: PreviewState = {
      ...initialState,
      mode: 'study',
      studyMode: 1,
      chapters: [
        { id: 1, name: 'Ch1', sort: 1, contents: [{ id: 1, coursewareCode: 100, sort: 1, duration: 300 }] },
        { id: 2, name: 'Ch2', sort: 2, contents: [{ id: 2, coursewareCode: 101, sort: 1, duration: 200 }] },
      ],
      coursewareProgressMap: new Map([
        [100, { progress: 80, watchDuration: 240, isCompleted: false }],
        [101, { progress: 0, watchDuration: 0, isCompleted: false }],
      ]),
      chapterLockMap: new Map([
        [1, { locked: false }],
        [2, { locked: true }],
      ]),
    };

    const newState = reducer(state, {
      type: 'UPDATE_COURSEWARE_PROGRESS',
      payload: { coursewareCode: 100, progress: 100, isCompleted: true },
    });

    expect(newState.coursewareProgressMap.get(100)?.progress).toBe(100);
    expect(newState.coursewareProgressMap.get(100)?.isCompleted).toBe(true);
    expect(newState.chapterLockMap.get(2)?.locked).toBe(false);
  });
});
