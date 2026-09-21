import { $t } from "@/i18n";
import { useContext, useCallback } from 'react';
import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { Context } from '../../context';
import styles from './index.module.less';
export default function ChapterList() {
  const {
    state,
    dispatch
  } = useContext(Context);
  const handleChapterClick = useCallback((chapterId?: number) => {
    dispatch({
      type: 'SET_SELECTED_CHAPTER',
      payload: chapterId
    });
  }, [dispatch]);
  const handleOpenEditor = useCallback(() => {
    dispatch({
      type: 'SET_CHAPTER_EDITOR_VISIBLE',
      payload: true
    });
  }, [dispatch]);

  // 不区分章节时不显示
  if (!state.basicInfo.hasChapter) {
    return null;
  }
  return <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{$t("章节列表")}</span>
      </div>

      {/* 章节列表 */}
      {state.chapters.map(chapter => <div key={chapter.id} className={`${styles.chapterItem} ${state.ui.selectedChapterId === chapter.id ? styles.active : ''}`} onClick={() => handleChapterClick(chapter.id)}>
          {chapter.name}
        </div>)}

      {/* 编辑章节按钮 */}
      {state.mode !== 'detail' && <Button type="dashed" block icon={<EditOutlined />} onClick={handleOpenEditor} className={styles.editButton}>{$t("编辑章节")}</Button>}
    </div>;
}