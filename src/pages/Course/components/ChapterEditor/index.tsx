import { $t } from "@/i18n";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Button, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnType } from 'xui-pro';
import DraggableLayoutTable from '@/components/DraggableLayoutTable';
import { ChapterEditorProps, Chapter } from './types';
import { validateChapterName, reorderChapters, getChapterId } from './utils';
import styles from './index.module.less';
const ChapterEditor: React.FC<ChapterEditorProps> = ({
  visible,
  value,
  courseStatus,
  onChange,
  onClose
}) => {
  // 临时编辑状态
  const [editingChapters, setEditingChapters] = useState<Chapter[]>([]);
  // 名称校验错误信息
  const [nameErrors, setNameErrors] = useState<Map<string | number, string>>(new Map());
  useEffect(() => {
    if (visible) {
      const chaptersWithId = value.map(chapter => ({
        ...chapter
      }));
      setEditingChapters(chaptersWithId);
      setNameErrors(new Map());
    }
  }, [visible, value]);

  // 添加新章节
  const handleAdd = useCallback(() => {
    const maxSort = editingChapters.reduce((max, chapter) => Math.max(max, chapter.sort), 0);
    const newChapter: Chapter = {
      id: Date.now(),
      name: '',
      sort: maxSort + 1
    };
    setEditingChapters(prev => [...prev, newChapter]);
  }, [editingChapters]);

  // 修改章节名称
  const handleNameChange = useCallback((chapter: Chapter, newName: string) => {
    const chapterId = getChapterId(chapter);

    // 更新章节名称
    setEditingChapters(prev => prev.map(c => getChapterId(c) === chapterId ? {
      ...c,
      name: newName
    } : c));

    // 实时校验
    const error = validateChapterName(newName, editingChapters, chapterId);
    setNameErrors(prev => {
      const newErrors = new Map(prev);
      if (error) {
        newErrors.set(chapterId, error);
      } else {
        newErrors.delete(chapterId);
      }
      return newErrors;
    });
  }, [editingChapters]);

  // 删除章节
  const handleDelete = useCallback((chapter: Chapter) => {
    // 刚添加未保存的章节，直接删除
    if (!chapter.id) {
      setEditingChapters(prev => prev.filter(c => c.id !== chapter.id));
      setNameErrors(prev => {
        const newErrors = new Map(prev);
        newErrors.delete(chapter.id!);
        return newErrors;
      });
      return;
    }

    // 已保存的章节，需要二次确认
    let confirmMessage = '';
    if (courseStatus === 'published') {
      confirmMessage = $t("章节变更将影响学员学习进度，是否确认？");
    } else {
      confirmMessage = $t("删除后该章节下所有课件将被移除，是否确认？");
    }
    Modal.confirm({
      title: $t("确认删除"),
      content: confirmMessage,
      onOk: () => {
        setEditingChapters(prev => prev.filter(c => c.id !== chapter.id));
        setNameErrors(prev => {
          const newErrors = new Map(prev);
          newErrors.delete(chapter.id!);
          return newErrors;
        });
      }
    });
  }, [courseStatus]);

  // 全量校验
  const validateAll = useCallback((): boolean => {
    const newErrors = new Map<string | number, string>();
    editingChapters.forEach(chapter => {
      const chapterId = getChapterId(chapter);
      const error = validateChapterName(chapter.name, editingChapters, chapterId);
      if (error) {
        newErrors.set(chapterId, error);
      }
    });
    setNameErrors(newErrors);
    return newErrors.size === 0;
  }, [editingChapters]);

  // 拖拽排序变化处理
  const handleSortChange = useCallback((newChapters: Chapter[]) => {
    const reorderedChapters = reorderChapters(newChapters);
    setEditingChapters(reorderedChapters);
  }, []);

  // 确认提交
  const handleConfirm = useCallback(() => {
    if (!validateAll()) {
      return;
    }

    // 重新计算 sort 字段
    const reorderedChapters = reorderChapters(editingChapters);
    onChange(reorderedChapters);
    onClose();
  }, [editingChapters, validateAll, onChange, onClose]);

  // 表格列定义
  const columns: ColumnType<Chapter>[] = useMemo(() => [{
    title: 'Chapter',
    dataIndex: 'name',
    render: (_: string, record: Chapter) => {
      const chapterId = getChapterId(record);
      const error = nameErrors.get(chapterId);
      return <div>
              <Input value={record.name} onChange={e => handleNameChange(record, e.target.value)} placeholder="Enter chapter name" status={error ? 'error' : ''} key={chapterId} />
              {error && <div className={styles.errorText}>{error}</div>}
            </div>;
    }
  }, {
    title: 'Action',
    width: 100,
    align: 'center',
    render: (_: any, record: Chapter) => <Button type="text" icon={<DeleteOutlined />} onClick={() => handleDelete(record)} danger />
  }], [nameErrors, handleNameChange, handleDelete]);
  return <Modal title="Edit Chapter" visible={visible} onCancel={onClose} width={600} destroyOnClose footer={[<Button key="cancel" onClick={onClose}>
          Cancel
        </Button>, <Button key="confirm" type="primary" onClick={handleConfirm}>
          Confirm
        </Button>]}>
      <div className={styles.container}>
        <DraggableLayoutTable columns={columns} dataSource={editingChapters} rowKey="id" sortable onSortChange={handleSortChange} pagination={false} scroll={{
        y: 400
      }} hasContainerStyle={false} dragColumn={{
        title: 'Sort',
        width: 60,
        align: 'center'
      }} />
        <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAdd} className={styles.addButton}>
          Add
        </Button>
      </div>
    </Modal>;
};
export default ChapterEditor;