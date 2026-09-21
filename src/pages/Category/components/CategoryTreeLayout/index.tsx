import { $t } from "@/i18n";
// src/pages/Category/components/CategoryTreeLayout/index.tsx
import { useState, useCallback } from 'react';
import { Row, Col, Button } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { getCategoryTree, type CategoryTreeNode } from '@/api/xp-evi-learning-admin-eu-boot/category';
import { CategoryTreeContext, type CategoryTreeContextValue } from './context';
import type { CategoryTreeLayoutProps } from './types';
import CategoryTree from './CategoryTree';
import CategorySortModal from './CategorySortModal';
import styles from './index.module.less';

export default function CategoryTreeLayout({
  renderContent,
  children,
  showLeafNodes = true,
  sortable = false,
  onSorted,
  defaultSelectedNodeId = 'all',
  leftSpan = 4,
  rightSpan = 20,
  heightOffset = 70,
  onTreeDataLoaded,
  fetchTreeData
}: CategoryTreeLayoutProps) {
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | string>(defaultSelectedNodeId);
  // 排序弹窗开关
  const [sortModalOpen, setSortModalOpen] = useState(false);

  // 获取分类树数据
  const {
    loading,
    run: fetchTree
  } = useRequest(async () => {
    let data: CategoryTreeNode[] = [];
    if (fetchTreeData) {
      data = await fetchTreeData();
    } else {
      const res: any = await getCategoryTree({
        name: ''
      });
      if (res.code === 200) {
        data = res.data || [];
      }
    }
    // 构造【全部】虚拟节点，与Level1平级
    const allNode: CategoryTreeNode = {
      id: 'all' as any,
      name: $t("全部"),
      parentId: 0,
      level: 0,
      sort: 0
    };
    return [allNode, ...data];
  }, {
    manual: false,
    onSuccess: data => {
      setTreeData(data);
      onTreeDataLoaded?.(data);
    }
  });

  // 刷新方法
  const refresh = useCallback(() => {
    fetchTree();
  }, [fetchTree]);

  // 打开/关闭排序弹窗
  const openSortModal = useCallback(() => setSortModalOpen(true), []);
  const closeSortModal = useCallback(() => setSortModalOpen(false), []);

  // 排序保存成功：刷新左侧树 + 通知外部刷新右侧表格
  const handleSorted = useCallback(() => {
    fetchTree();
    onSorted?.();
  }, [fetchTree, onSorted]);

  // Context 值
  const contextValue: CategoryTreeContextValue = {
    treeData,
    selectedNodeId,
    setSelectedNodeId,
    refresh,
    loading
  };
  return <CategoryTreeContext.Provider value={contextValue}>
      <div className={styles.container} style={{ height: `calc(100vh - ${heightOffset}px)` }}>
        <div className={styles.content}>
          <Row gutter={16} style={{
          height: '100%'
        }}>
            {/* 左侧分类树 */}
            <Col span={leftSpan} className={styles.leftPanel}>
              {sortable && (
                <div style={{ marginBottom: 8, textAlign: 'right' }}>
                  <Button size="small" icon={<SwapOutlined rotate={90} />} onClick={openSortModal}>
                    {$t('排序')}
                  </Button>
                </div>
              )}
              <CategoryTree treeData={treeData} selectedNodeId={selectedNodeId} onSelect={setSelectedNodeId} showLeafNodes={showLeafNodes} />
            </Col>

            {/* 右侧内容区域 */}
            <Col span={rightSpan} className={styles.rightPanel}>
              {renderContent(selectedNodeId, refresh)}
            </Col>
          </Row>
        </div>
      </div>

      {/* 排序弹窗（仅 sortable 时挂载） */}
      {sortable && (
        <CategorySortModal open={sortModalOpen} onClose={closeSortModal} onSaved={handleSorted} />
      )}

      {/* 额外的子组件（如 Modal、Drawer 等） */}
      {children}
    </CategoryTreeContext.Provider>;
}
