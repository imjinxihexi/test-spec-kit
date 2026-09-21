import { $t } from "@/i18n";
import { useCallback, useContext, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { message, Button } from 'antd';
import { Context } from './context';
import { convertDetailToState, convertStateToSubmitData } from './utils';
import { getCourseDetail, getDefaultCovers, createCourse, updateCourse } from '@/api/xp-evi-learning-admin-eu-boot/course';
// 页面组件导入
import { BasicInfoForm, ChapterList, CoursewareTable } from './components';
import type { BasicInfoFormRef } from './components/BasicInfoForm';
// 共享组件导入
import ChapterEditor from '@/pages/Course/components/ChapterEditor';
import { VisibilityEnum } from '@/typings/visibility';
import { validateVisibility } from '@/components/VisibilityConfig';
import styles from './index.module.less';
export default function CoursePage() {
  const {
    state,
    dispatch
  } = useContext(Context);
  const location = useLocation();
  const basicInfoFormRef = useRef<BasicInfoFormRef>(null);

  // 页面初始化
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode') as 'create' | 'edit' | 'detail' || 'create';
    const courseCode = params.get('courseCode') || undefined;
    const categoryId = params.get('categoryId');

    if (categoryId && categoryId !== 'all') {
      dispatch({
        type: 'INIT_PAGE',
        payload: {
          mode,
          courseCode: Number(courseCode),
          categoryId: Number(categoryId)
        }
      });
    } else {
      dispatch({
        type: 'INIT_PAGE',
        payload: {
          mode,
          courseCode: Number(courseCode)
        }
      });
    }
  }, [location.search, dispatch]);

  // 加载系统封面和课程详情
  useEffect(() => {
    async function loadData() {
      try {
        dispatch({
          type: 'SET_LOADING',
          payload: true
        });

        // 加载系统封面
        const coversRes = await getDefaultCovers();
        if (coversRes.code === 200 && coversRes.data) {
          dispatch({
            type: 'SET_SYSTEM_COVERS',
            payload: coversRes.data
          });

          // create 模式设置默认封面
          if (state.mode === 'create' && coversRes.data.length > 0) {
            dispatch({
              type: 'SET_BASIC_INFO',
              payload: {
                coverUrl: coversRes.data[0]
              }
            });
          }
        }

        // edit/detail 模式加载详情
        if ((state.mode === 'edit' || state.mode === 'detail') && state.courseCode) {
          const detailRes = await getCourseDetail(state.courseCode);
          if (detailRes.code === 200 && detailRes.data) {
            const convertedData = convertDetailToState(detailRes.data);
            dispatch({
              type: 'LOAD_COURSE_DETAIL',
              payload: convertedData
            });
          } else {
            message.error(detailRes.msg || $t("加载课程详情失败"));
          }
        }
      } catch (error) {
        message.error($t("加载数据失败"));
        console.error(error);
      } finally {
        dispatch({
          type: 'SET_LOADING',
          payload: false
        });
      }
    }
    if (state.mode) {
      loadData();
    }
  }, [state.mode, state.courseCode, dispatch]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    try {
      // 校验基础信息表单
      const isValid = await basicInfoFormRef.current?.validate();
      if (!isValid) {
        // 滚动到基础信息区域
        document.querySelector(`.${styles.section}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        return;
      }

      // 校验可见性配置
      const visibilityError = validateVisibility({
        visibility: state.basicInfo.visibility,
        rules: state.basicInfo.visibilityRules
      });
      if (visibilityError) {
        message.error(visibilityError);
        return;
      }

      // 校验课件
      if (state.coursewares.length === 0) {
        message.error($t("请至少添加一个课件"));
        return;
      }

      // 区分章节时,检查课件是否都分配了章节
      if (state.basicInfo.hasChapter) {
        const unassignedCoursewares = state.coursewares.filter(cw => !cw.chapterId);
        if (unassignedCoursewares.length > 0) {
          message.error($t("区分章节时,所有课件必须分配章节"));
          return;
        }
      }
      dispatch({
        type: 'SET_LOADING',
        payload: true
      });
      const submitData = convertStateToSubmitData(state);
      let res;
      if (state.mode === 'create') {
        res = await createCourse(submitData);
      } else {
        res = await updateCourse(submitData);
      }
      if (res.code === 200) {
        message.success(state.mode === 'create' ? $t("创建成功") : $t("更新成功"));
        window.xDragonBridge.openNewTab({
          path: `/smart-trains/course/list?should_refresh=${Date.now()}`
        });
      } else {
        message.error(res.msg || $t("操作失败"));
      }
    } catch (error) {
      message.error($t("操作失败"));
      console.error(error);
    } finally {
      dispatch({
        type: 'SET_LOADING',
        payload: false
      });
    }
  }, [state, dispatch]);
  return <div className={styles.container}>
      {/* 1. 基础信息 + 可见范围（由 BasicInfoForm 渲染两个 section） */}
      <BasicInfoForm ref={basicInfoFormRef} />

      {/* 2. 课件列表 */}
      <div className={styles.section}>
        <div className={styles.coursewareSection}>
          {/* 左侧章节列表（区分章节时显示） */}
          <ChapterList />

          {/* 右侧课件表格 */}
          <div className={styles.coursewareContent}>
            <CoursewareTable />
          </div>
        </div>
      </div>

      {/* 3. 底部操作按钮 */}
      <div className={styles.footer}>
        {state.mode !== 'detail' && <Button type="primary" onClick={handleSubmit} loading={state.ui.loading}>
            {state.mode === 'create' ? $t("创建") : $t("保存")}
          </Button>}
      </div>

      {/* 4. 弹窗组件 */}
      <ChapterEditor visible={state.ui.chapterEditorVisible} value={state.chapters} courseStatus={state.basicInfo.visibility === VisibilityEnum.HIDDEN ? 'hidden' : state.courseCode ? 'published' : undefined} onChange={chapters => {
      dispatch({
        type: 'UPDATE_CHAPTERS',
        payload: chapters
      });
    }} onClose={() => {
      dispatch({
        type: 'SET_CHAPTER_EDITOR_VISIBLE',
        payload: false
      });
    }} />
    </div>;
}