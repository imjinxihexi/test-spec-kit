// src/pages/Category/components/CategoryTreeLayout/CategoryTree.tsx
import { Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { CategoryTreeNode } from '@/api/xp-evi-learning-admin-eu-boot/category';
import styles from './CategoryTree.module.less';

interface CategoryTreeProps {
  treeData: CategoryTreeNode[];
  selectedNodeId: number | string;
  onSelect: (nodeId: number | string) => void;
  showLeafNodes?: boolean; // 是否展示叶子节点，默认为 true
}

// 自定义展开/收起图标，匹配 MasterGo 设计稿
const SwitcherIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M4.14645 6.14645C4.32001 5.97288 4.58944 5.9536 4.78431 6.08859L4.85355 6.14645L8 9.293L11.1464 6.14645C11.32 5.97288 11.5894 5.9536 11.7843 6.08859L11.8536 6.14645C12.0271 6.32001 12.0464 6.58944 11.9114 6.78431L11.8536 6.85355L8.35355 10.3536C8.17999 10.5271 7.91056 10.5464 7.71569 10.4114L7.64645 10.3536L4.14645 6.85355C3.95118 6.65829 3.95118 6.34171 4.14645 6.14645Z"
      fill="currentColor"
    />
  </svg>
);

export default function CategoryTree({
  treeData,
  selectedNodeId,
  onSelect,
  showLeafNodes = true,
}: CategoryTreeProps) {
  // 转换数据格式为 antd Tree 所需格式
  const convertToTreeData = (nodes: CategoryTreeNode[]): DataNode[] => {
    return nodes
      .filter((node) => {
        // "全部"节点始终显示
        if (String(node.id) === 'all') {
          return true;
        }
        // 如果 showLeafNodes 为 false，过滤掉 level 4 的节点
        if (!showLeafNodes && node.level === 4) {
          return false;
        }
        return true;
      })
      .map((node) => ({
        key: String(node.id),
        // 标题被样式限制为单行省略，这里挂原生 title，鼠标悬浮可看完整名称
        title: <span title={node.name}>{node.name}</span>,
        children: node.children ? convertToTreeData(node.children) : undefined,
      }));
  };

  const treeNodes = convertToTreeData(treeData);

  // 处理节点选择
  const handleSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length > 0) {
      const nodeId = selectedKeys[0];
      // 如果是 'all' 节点，传递字符串，否则转换为数字
      onSelect(nodeId === 'all' ? 'all' : Number(nodeId));
    }
  };

  return (
    <div className={styles.treeContainer}>
      <Tree
        treeData={treeNodes}
        selectedKeys={[String(selectedNodeId)]}
        onSelect={handleSelect}
        defaultExpandedKeys={[]}
        showLine={false}
        switcherIcon={<SwitcherIcon />}
        className={styles.tree}
      />
    </div>
  );
}
