import { $t } from "@/i18n";
import { useContext, useMemo, useState, useCallback } from 'react';
import { useMemoizedFn } from 'ahooks';
import { Button, Modal, Select, Space } from 'antd';
import type { ColumnType } from 'xui-pro';
import DraggableLayoutTable from '@/components/DraggableLayoutTable';
import { Context } from '../../context';
import type { CoursewareItem } from '../../store';
import CoursewareSelector from '@/pages/Course/components/CoursewareSelector';
import AddCourseware from '@/pages/Courseware/components/AddCourseware';
import type { Courseware } from '@/api/xp-evi-learning-admin-eu-boot/courseware';
import { getTypeLabel } from '@/pages/Courseware/components/CoursewareFormModal/utils';
import type { AddCoursewareSuccessResult } from '@/pages/Courseware/components/AddCourseware';
import styles from './index.module.less';
export default function CoursewareTable() {
  const {
    state,
    dispatch
  } = useContext(Context);
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return $t("{{minutes}}分钟", {
      minutes
    });
  };
  const [editingCourseware, setEditingCourseware] = useState<CoursewareItem | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<number | undefined>(undefined);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const handleDelete = useCallback((record: CoursewareItem) => {
    Modal.confirm({
      title: $t("确认删除"),
      content: $t("确定要删除课件\"{{value0}}\"吗？", {
        value0: record.coursewareName
      }),
      onOk: () => {
        dispatch({
          type: 'DELETE_COURSEWARE',
          payload: record.coursewareCode
        });
      }
    });
  }, [dispatch]);
  const handleEditChapter = useCallback((record: CoursewareItem) => {
    setEditingCourseware(record);
    setSelectedChapterId(record.chapterId);
  }, []);
  const handleConfirmEditChapter = useCallback(() => {
    if (editingCourseware) {
      dispatch({
        type: 'UPDATE_COURSEWARE_CHAPTER',
        payload: {
          coursewareCode: editingCourseware.coursewareCode,
          chapterId: selectedChapterId
        }
      });
    }
    setEditingCourseware(null);
    setSelectedChapterId(undefined);
  }, [editingCourseware, selectedChapterId, dispatch]);
  const handleCancelEditChapter = useCallback(() => {
    setEditingCourseware(null);
    setSelectedChapterId(undefined);
  }, []);

  // 从已有课件选择:仅"新增"的部分(弹窗内已与原有列表做 diff)
  const handleSelectCoursewares = useCallback((coursewares: Courseware[]) => {
    const items: CoursewareItem[] = coursewares.map(cw => ({
      coursewareCode: cw.id,
      // cw.id 已经是 string 类型
      coursewareName: cw.name,
      duration: cw.duration,
      fileType: cw.type?.toString() || '',
      sort: 0,
      chapterId: state.basicInfo.hasChapter ? state.ui.selectedChapterId : undefined
    }));
    dispatch({
      type: 'ADD_COURSEWARES',
      payload: items
    });
    setSelectorVisible(false);
  }, [state.basicInfo.hasChapter, state.ui.selectedChapterId, dispatch]);

  // 从弹窗取消勾选原有课件:批量从课程中移除
  const handleRemoveCoursewares = useMemoizedFn((removedIds: number[]) => {
    removedIds.forEach(id => {
      dispatch({
        type: 'DELETE_COURSEWARE',
        payload: id
      });
    });
  });

  // 上传新课件成功，直接加入课件列表
  const handleAddCoursewareSuccess = useCallback((result: AddCoursewareSuccessResult) => {
    const {
      coursewareCodes,
      submittedData
    } = result;
    const dataList = result.type === 'batch' ? submittedData : [submittedData];
    const items: CoursewareItem[] = coursewareCodes.map((code, index) => ({
      coursewareCode: code,
      coursewareName: dataList[index]?.name || '',
      duration: dataList[index]?.duration || 0,
      fileType: dataList[index]?.type?.toString() || '',
      sort: 0,
      chapterId: state.basicInfo.hasChapter ? state.ui.selectedChapterId : undefined
    }));
    dispatch({
      type: 'ADD_COURSEWARES',
      payload: items
    });
  }, [state.basicInfo.hasChapter, state.ui.selectedChapterId, dispatch]);

  // 根据选中章节筛选课件
  const filteredCoursewares = useMemo(() => {
    if (!state.basicInfo.hasChapter || state.ui.selectedChapterId === undefined) {
      return state.coursewares;
    }
    return state.coursewares.filter(cw => cw.chapterId === state.ui.selectedChapterId);
  }, [state.coursewares, state.basicInfo.hasChapter, state.ui.selectedChapterId]);
  const handleSortChange = useCallback((newCoursewares: CoursewareItem[]) => {
    // 如果是章节内排序，需要合并回全局列表
    if (state.basicInfo.hasChapter && state.ui.selectedChapterId !== undefined) {
      // 获取其他章节的课件
      const otherCoursewares = state.coursewares.filter(cw => cw.chapterId !== state.ui.selectedChapterId);

      // 合并并重新计算 sort
      const mergedCoursewares = [...otherCoursewares, ...newCoursewares].map((cw, index) => ({
        ...cw,
        sort: index + 1
      }));
      dispatch({
        type: 'REORDER_COURSEWARES',
        payload: mergedCoursewares
      });
    } else {
      // 全局排序
      dispatch({
        type: 'REORDER_COURSEWARES',
        payload: newCoursewares
      });
    }
  }, [state.basicInfo.hasChapter, state.ui.selectedChapterId, state.coursewares, dispatch]);
  const columns: ColumnType<CoursewareItem>[] = useMemo(() => [{
    title: $t("课件名称"),
    dataIndex: 'coursewareName',
    width: 300,
    ellipsis: true
  }, {
    title: $t("时长"),
    dataIndex: 'duration',
    width: 100,
    render: (duration: number) => formatDuration(duration)
  }, {
    title: $t("文件类型"),
    dataIndex: 'fileType',
    width: 100,
    // fileType 存的是 CoursewareType 枚举字符串形式(见 handleSelectCoursewares 里 cw.type?.toString());共享 getTypeLabel 接收 number,转一下
    render: (fileType: string) => getTypeLabel(Number(fileType))
  }, {
    title: $t("所属章节"),
    width: 150,
    render: (_: any, record: CoursewareItem) => {
      if (!state.basicInfo.hasChapter) {
        return '-';
      }
      const chapter = state.chapters.find(ch => ch.id === record.chapterId);
      return <span className={styles.chapterCell}>
            {chapter ? chapter.name : $t("未分配")}
          </span>;
    }
  }, ...(state.mode !== 'detail' ? [{
    title: $t("操作"),
    width: 150,
    align: 'center' as const,
    render: (_: any, record: CoursewareItem) => <div>
          {state.basicInfo.hasChapter && <Button type="link" size="small" onClick={() => handleEditChapter(record)}>{$t("编辑章节")}</Button>}
          <Button type="link" size="small" danger onClick={() => handleDelete(record)}>{$t("删除")}</Button>
        </div>
  }] : [])], [state.basicInfo.hasChapter, state.chapters, state.mode, handleEditChapter, handleDelete]);
  return <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{$t("课件列表")}</span>
        {state.mode !== 'detail' && <Space>
              <Button onClick={() => setSelectorVisible(true)} disabled={!state.basicInfo.lang}>
                Select
              </Button>
              <AddCourseware disabled={!state.basicInfo.lang} categoryId={state.basicInfo.categoryId} lang={state.basicInfo.lang} fixedLang={!!state.basicInfo.categoryId} onSuccess={handleAddCoursewareSuccess} />
            </Space>}
      </div>

      <DraggableLayoutTable columns={columns} dataSource={filteredCoursewares} rowKey="coursewareCode" sortable={state.mode !== 'detail'} onSortChange={handleSortChange} pagination={false} hasContainerStyle={false} />

      {/* 编辑章节弹窗 */}
      <Modal title={$t("编辑章节归属")} visible={!!editingCourseware} onOk={handleConfirmEditChapter} onCancel={handleCancelEditChapter} width={400}>
        <div>
          <div style={{
          marginBottom: 8
        }}>{$t("课件：")}{editingCourseware?.coursewareName}</div>
          <Select style={{
          width: '100%'
        }} placeholder={$t("请选择章节")} value={selectedChapterId} onChange={setSelectedChapterId} allowClear options={state.chapters.map(ch => ({
          label: ch.name,
          value: ch.id
        }))} />
        </div>
      </Modal>

      {/* 课件选择器
          existingCoursewares:把已在课程中的课件 record 一起传进去(id/name/duration),
          让弹窗右侧「已选」能立刻渲染,避免弹窗按 lang 过滤时这些课件被过滤掉导致右侧空白 */}
      <CoursewareSelector visible={selectorVisible} categoryId={state.basicInfo.categoryId} lang={state.basicInfo.lang}
        existingCoursewareIds={state.coursewares.map(cw => cw.coursewareCode)}
        existingCoursewares={state.coursewares.map(cw => ({
          id: cw.coursewareCode,
          name: cw.coursewareName,
          duration: cw.duration || 0,
        }))}
        onSelect={handleSelectCoursewares} onRemove={handleRemoveCoursewares} onClose={() => setSelectorVisible(false)} />
    </div>;
}