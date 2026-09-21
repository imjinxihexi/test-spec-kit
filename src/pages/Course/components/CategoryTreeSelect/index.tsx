import { $t } from "@/i18n";
import { useEffect, useState } from 'react';
import { TreeSelect } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useRequest } from 'ahooks';
import { getCategoryTree, type CategoryTreeNode } from '@/api/xp-evi-learning-admin-eu-boot/category';
interface CategoryTreeSelectProps {
  value?: number;
  onChange?: (value?: number) => void;
  readonly?: boolean;
  placeholder?: string;
}
export default function CategoryTreeSelect({
  value,
  onChange,
  readonly = false,
  placeholder = $t("请选择分类")
}: CategoryTreeSelectProps) {
  const [treeData, setTreeData] = useState<DataNode[]>([]);

  // 过滤分类树，只保留指定层级及以下
  const filterTreeByLevel = (nodes: CategoryTreeNode[], maxLevel: number): CategoryTreeNode[] => {
    return nodes.filter(node => node.level <= maxLevel).map(node => ({
      ...node,
      children: node.children ? filterTreeByLevel(node.children, maxLevel) : undefined
    }));
  };

  // 转换为 TreeSelect 所需格式
  const convertToTreeSelectData = (nodes: CategoryTreeNode[]): DataNode[] => {
    return nodes.map(node => ({
      key: node.id,
      value: node.id,
      title: node.name,
      children: node.children ? convertToTreeSelectData(node.children) : undefined
    }));
  };

  // 根据 value 查找对应的分类名称
  const findCategoryName = (nodes: DataNode[], targetValue?: number): string => {
    if (!targetValue) return '';
    for (const node of nodes) {
      if (node.key === targetValue) {
        return node.title as string;
      }
      if (node.children) {
        const found = findCategoryName(node.children, targetValue);
        if (found) return found;
      }
    }
    return '';
  };

  // 获取分类树:cacheKey 共享缓存,避免同一页面里多处 CategoryTreeSelect(如课程编辑表单 + 课件搜索弹窗)重复拉;
  // staleTime 5 分钟,减少弹窗重挂载时的加载空窗期(空窗期 value 无法回显 title,会显示 placeholder)
  const {
    data: cachedTree
  } = useRequest(async () => {
    const res: any = await getCategoryTree({ name: '' });
    if (res.code === 200) return res.data || [];
    return [];
  }, {
    cacheKey: 'category-tree',
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (cachedTree) {
      const filteredData = filterTreeByLevel(cachedTree, 4);
      setTreeData(convertToTreeSelectData(filteredData));
    }
  }, [cachedTree]);

  // readonly 模式：显示纯文本
  if (readonly) {
    const categoryName = findCategoryName(treeData, value);
    return <>{categoryName || '-'}</>;
  }
  // value 直接透传:tree 首次加载空窗期,antd TreeSelect 会在无匹配节点时显示 placeholder,但 form value 保留;
  // tree 到达后自动回显 title。之前 `treeData.length ? value : undefined` 会误清 form 里可能已存在的值展示态。
  return <TreeSelect value={value} onChange={onChange} treeData={treeData} placeholder={placeholder} allowClear showSearch treeDefaultExpandAll={false} filterTreeNode={(input: string, node: any) => (node.title as string).toLowerCase().includes(input.toLowerCase())} style={{
    width: '100%'
  }} />;
}