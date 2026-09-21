import { $t } from "@/i18n";
// src/pages/Category/Management/components/CategoryModal/index.tsx
import { useContext, useEffect, useState, useCallback } from 'react';
import { message } from 'antd';
import { ModalForm } from 'xui-pro';
import type { DataNode } from 'antd/es/tree';
import { useCategoryTree } from '@/pages/Category/components';
import { Context } from '../../context';
import { createCategory, updateCategory, getCategoryTree, type CategoryTreeNode } from '@/api/xp-evi-learning-admin-eu-boot/category';
import { useRequest } from 'ahooks';
import styles from './index.module.less';
interface FormValues {
  name: string;
  parentId?: number;
  parentIdDisplay?: string;
}
export default function CategoryModal() {
  const {
    refresh
  } = useCategoryTree();
  const {
    state,
    dispatch,
    refreshList
  } = useContext(Context);
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [formValues, setFormValues] = useState<FormValues>({} as FormValues);
  const {
    modalVisible,
    modalMode,
    currentCategory,
    parentCategory
  } = state;

  // 获取分类树（用于选择上级分类）
  const {
    run: fetchTreeForSelect
  } = useRequest(async () => {
    const res: any = await getCategoryTree({
      name: ''
    });
    if (res.code === 200) {
      return res.data || [];
    }
    return [];
  }, {
    manual: true,
    onSuccess: data => {
      // 过滤只保留 Level 1/2/3 的分类
      const filteredData = filterTreeByLevel(data, 3);
      setTreeData(convertToTreeSelectData(filteredData));
    }
  });

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
  const {
    selectedNodeId
  } = useCategoryTree();

  // 弹窗打开时初始化
  useEffect(() => {
    if (modalVisible) {
      if (modalMode === 'add') {
        // 新增模式：加载分类树供选择
        fetchTreeForSelect();
        if (selectedNodeId === 'all') {
          setFormValues({
            name: ''
          });
        } else {
          setFormValues({
            name: '',
            parentId: Number(selectedNodeId)
          });
        }
      } else if (modalMode === 'addChild' && parentCategory) {
        // 新增子分类模式：上级分类自动填充
        setFormValues({
          name: '',
          parentId: parentCategory.id,
          parentIdDisplay: parentCategory.name
        });
      } else if (modalMode === 'edit' && currentCategory) {
        // 编辑模式：回显数据
        setFormValues({
          name: currentCategory.name,
          parentId: currentCategory.parentId === 0 ? undefined : currentCategory.parentId,
          parentIdDisplay: currentCategory.parentName || $t("一级分类")
        });
      }
    }
  }, [modalVisible, modalMode, currentCategory, parentCategory]);

  // 关闭弹窗
  const handleClose = useCallback(() => {
    dispatch({
      type: 'CLOSE_MODAL'
    });
    setFormValues({} as FormValues);
  }, [dispatch]);

  // 提交表单
  const handleSubmit = useCallback(async (values: FormValues) => {
    try {
      if (modalMode === 'edit' && currentCategory) {
        const res: any = await updateCategory({ id: currentCategory.id, name: values.name });
        if (res.code === 200) {
          message.success($t("编辑成功"));
          refresh();
          refreshList?.();
          return { success: true };
        } else {
          message.error(res.msg || $t("编辑失败"));
          return { success: false };
        }
      } else {
        const res: any = await createCategory({ name: values.name, parentId: values.parentId || 0 });
        if (res.code === 200) {
          message.success($t("新增成功"));
          refresh();
          refreshList?.();
          return { success: true };
        } else {
          message.error(res.msg || $t("新增失败"));
          return { success: false };
        }
      }
    } catch (error) {
      console.error($t("提交失败:"), error);
      return { success: false };  // ← 网络异常等也不关闭弹窗
    }
  }, [modalMode, currentCategory, refresh, refreshList]);

  // 弹窗标题
  const getTitle = () => {
    if (modalMode === 'edit') return $t("编辑分类");
    if (modalMode === 'addChild') return $t("新增分类");
    return $t("新增分类");
  };

  // 是否为只读模式（编辑时上级分类只读，新增子分类时上级分类只读）
  const isParentReadonly = modalMode === 'edit' || modalMode === 'addChild';

  // 表单项定义
  const formItems = [{
    label: $t("分类名称"),
    name: 'name',
    type: 'input',
    rules: [{
      required: true,
      message: $t("请输入分类名称")
    }, {
      max: 50,
      message: $t("分类名称不能超过50个字符")
    }, {
      min: 1,
      message: $t("分类名称不能为空")
    }],
    required: true,
    props: {
      placeholder: $t("请输入分类名称"),
      // maxLength: 50
    }
  },
  // 只读模式：显示上级分类名称
  ...(isParentReadonly ? [{
    label: $t("上级分类"),
    name: 'parentIdDisplay',
    type: 'input' as const,
    props: {
      disabled: true
    }
  },
  // 隐藏字段：保存 parentId 用于提交
  {
    name: 'parentId',
    type: 'input' as const,
    props: {
      style: {
        display: 'none'
      }
    }
  }] : [{
    label: $t("上级分类"),
    name: 'parentId',
    type: 'treeSelect' as const,
    props: {
      treeData,
      placeholder: $t("请选择"),
      allowClear: true,
      showSearch: true,
      treeDefaultExpandAll: false,
      filterTreeNode: (input: string, node: any) => (node.title as string).toLowerCase().includes(input.toLowerCase())
    }
  }])] as any;
  return <ModalForm title={getTitle()} visible={modalVisible} formItems={formItems} initialValues={formValues} onFinish={handleSubmit} onCancel={handleClose} width={400} className={styles.modal} />;
}