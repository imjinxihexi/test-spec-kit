import { $t } from '@/i18n';
// src/pages/Category/components/CategoryTreeLayout/CategorySortModal.tsx
import { useRef, useState } from 'react';
import { Modal, Tree, message, Spin } from 'antd';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { useRequest } from 'ahooks';
import {
  getCategoryTree,
  sortCategory,
  type CategoryTreeNode,
  type CategorySortGroup,
} from '@/api/xp-evi-learning-admin-eu-boot/category';
import styles from './CategorySortModal.module.less';

interface CategorySortModalProps {
  open: boolean;
  onClose: () => void;
  /** 保存成功回调（用于刷新左树 + 右表） */
  onSaved?: () => void;
}

/**
 * 分类排序弹窗：展示分类树（与主树一致，不含 Level4 叶子），支持「同父级内部」拖拽排序，
 * 点击保存后仅提交「顺序相对初始发生变化」的父级分组（净零变化不提交）。不允许跨父级拖拽。
 * 注：项目 ahooks 为 v2，无 useMemoizedFn，函数使用普通声明。
 */
export default function CategorySortModal({ open, onClose, onSaved }: CategorySortModalProps) {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [saving, setSaving] = useState(false);
  // 拖拽视觉态（逐节点控制，不依赖 antd 内部 drag-over 类名）
  // dragKey：正在被拖动的节点；hoverKey：当前悬停的节点；hoverValid：该悬停目标是否可交换（同父级）
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [hoverValid, setHoverValid] = useState(true);
  // 正在拖拽节点的父级ID
  const dragPidRef = useRef<number | undefined>(undefined);
  // id -> parentId（顶级为 0）
  const parentMapRef = useRef<Map<number, number>>(new Map());
  // 初始各父级下子节点顺序快照：parentId -> "id,id,id"（用于净零变化判断）
  const snapshotRef = useRef<Map<number, string>>(new Map());

  // 转 DataNode：过滤 Level4 叶子（与分类管理主树 showLeafNodes=false 保持一致），并建 id->parentId
  const buildTree = (nodes: CategoryTreeNode[]): DataNode[] =>
    nodes
      .filter((n) => n.level !== 4)
      .map((n) => {
        parentMapRef.current.set(Number(n.id), Number(n.parentId));
        return {
          key: String(n.id),
          title: n.name,
          children: n.children && n.children.length > 0 ? buildTree(n.children) : undefined,
        };
      });

  // 记录初始顺序快照（含顶级 parentId=0）
  const collectSnapshot = (nodes: DataNode[], parentId: number) => {
    snapshotRef.current.set(parentId, nodes.map((n) => n.key).join(','));
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        collectSnapshot(n.children as DataNode[], Number(n.key));
      }
    });
  };

  // 打开时拉取最新分类树
  const { loading } = useRequest(
    async () => {
      const res: any = await getCategoryTree({ name: '' });
      return res.code === 200 ? (res.data as CategoryTreeNode[]) || [] : [];
    },
    {
      ready: open,
      refreshDeps: [open],
      onSuccess: (data) => {
        parentMapRef.current = new Map();
        snapshotRef.current = new Map();
        const tree = buildTree(data);
        collectSnapshot(tree, 0);
        setTreeData(tree);
      },
    }
  );

  // 在树中找到指定父级的子节点数组（顶级 parentId=0 返回根数组）；未找到返回 null（与"空数组"区分）
  const findChildrenArr = (nodes: DataNode[], parentKey: string): DataNode[] | null => {
    for (const node of nodes) {
      if (node.key === parentKey) {
        return (node.children as DataNode[]) ?? [];
      }
      if (node.children) {
        const found = findChildrenArr(node.children as DataNode[], parentKey);
        if (found !== null) {
          return found;
        }
      }
    }
    return null;
  };

  // 采用 antd/rc-tree 官方的拖拽写法（插入式）：把被拖节点移动到目标位置。
  // 落点许可保持库的默认行为，不做限制；唯一附加的业务约束是「必须同一父级」，
  // 以保证不改变分类的父子层级。
  const allowDrop: TreeProps['allowDrop'] = () => true;

  // 清理拖拽视觉态
  const resetDragState = () => {
    dragPidRef.current = undefined;
    setDragKey(null);
    setHoverKey(null);
    setHoverValid(true);
  };

  // 开始拖拽：记录源节点及其父级
  const handleDragStart: TreeProps['onDragStart'] = ({ node }) => {
    dragPidRef.current = parentMapRef.current.get(Number(node.key));
    setDragKey(String(node.key));
    setHoverKey(null);
    setHoverValid(true);
  };

  // 拖拽进入某节点：高亮当前目标行。
  // 判断口径与 handleDrop 保持一致：目标行的父级 == 被拖节点的父级 → 可放置（蓝色）；
  // 落在自身父节点那一行属于「移到该父级首位」，合法但不高亮父节点本身。
  const handleDragEnter: TreeProps['onDragEnter'] = ({ node }) => {
    const key = String(node.key);
    const dragPid = dragPidRef.current;
    if (dragPid === undefined) {
      return;
    }
    if (Number(key) === dragPid) {
      setHoverKey(null);
      return;
    }
    const hoverPid = parentMapRef.current.get(Number(key));
    setHoverKey(key);
    setHoverValid(hoverPid !== undefined && hoverPid === dragPid);
  };

  // 拖拽结束：清理状态
  const handleDragEnd: TreeProps['onDragEnd'] = () => {
    resetDragState();
  };

  const handleDrop: TreeProps['onDrop'] = (info) => {
    // 落下即结束拖拽，清理高亮态
    resetDragState();

    const dragKeyDropped = String(info.dragNode.key);
    const dropKey = String(info.node.key);
    if (dragKeyDropped === dropKey) {
      return;
    }

    // 官方写法：dropPosition 减去目标节点在其父级中的下标，得到相对位置
    // -1 = 落在目标上方，0 = 落在目标内部，1 = 落在目标下方
    const posArr = String(info.node.pos).split('-');
    const relativePos = info.dropPosition - Number(posArr[posArr.length - 1]);

    const dragPid = parentMapRef.current.get(Number(dragKeyDropped));
    // 目标父级：落在节点内部时是该节点本身；落在间隙时是该节点的父级
    const targetPid = !info.dropToGap
      ? Number(dropKey)
      : parentMapRef.current.get(Number(dropKey));

    // 业务约束：只能在同一父级内部调整顺序，不改变父子层级
    if (dragPid === undefined || targetPid === undefined || targetPid !== dragPid) {
      message.warning($t('只能在同一分类下调整顺序'));
      return;
    }

    // 深拷贝后在同一父级的子数组内移动（title 均为字符串，JSON 安全）
    const next = JSON.parse(JSON.stringify(treeData)) as DataNode[];
    const siblings = dragPid === 0 ? next : (findChildrenArr(next, String(dragPid)) ?? []);
    const fromIdx = siblings.findIndex((n) => n.key === dragKeyDropped);
    if (fromIdx < 0) {
      return;
    }

    // 先取出被拖节点，再计算插入位置（此时数组已不含被拖节点，下标以移除后的数组为准）
    const [moved] = siblings.splice(fromIdx, 1);

    let insertIdx: number;
    if (!info.dropToGap) {
      // 落在自身父节点内部 → 成为该父级的第一个子节点
      insertIdx = 0;
    } else {
      const dropIdx = siblings.findIndex((n) => n.key === dropKey);
      if (dropIdx < 0) {
        return;
      }
      insertIdx = relativePos === -1 ? dropIdx : dropIdx + 1;
    }

    if (insertIdx === fromIdx) {
      // 位置未发生变化
      return;
    }
    siblings.splice(insertIdx, 0, moved);

    setTreeData(next);
  };

  // 依据拖拽态渲染节点。
  // 视觉分工：位置由 antd 的插入指示线表达（蓝色细线）；
  // 行底色只用于两件事：① 标记被拖的源行（淡化）② 标记非法落点（红色，跨父级）。
  // 有效落点不再叠加蓝色行底，避免与插入线形成双重提示、造成干扰。
  const decorateNodes = (nodes: DataNode[]): DataNode[] =>
    nodes.map((n) => {
      const key = String(n.key);
      const name = typeof n.title === 'string' ? n.title : '';
      const cls = [styles.row];
      if (dragKey && key === dragKey) {
        cls.push(styles.rowSource);
      } else if (dragKey && hoverKey && key === hoverKey && !hoverValid) {
        cls.push(styles.rowNo);
      }
      return {
        ...n,
        title: <div className={cls.join(' ')}>{name}</div>,
        children: n.children ? decorateNodes(n.children as DataNode[]) : undefined,
      };
    });

  const handleSave = async () => {
    // 遍历当前树，仅收集顺序相对初始快照发生变化的父级（净零变化不提交）
    const groups: CategorySortGroup[] = [];
    const collect = (nodes: DataNode[], parentId: number) => {
      const curKeys = nodes.map((n) => n.key);
      if (curKeys.join(',') !== (snapshotRef.current.get(parentId) ?? '')) {
        groups.push({ parentId, sortedIds: curKeys.map((k) => Number(k)) });
      }
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          collect(n.children as DataNode[], Number(n.key));
        }
      });
    };
    collect(treeData, 0);

    // 未做任何有效调整，直接关闭
    if (groups.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const res: any = await sortCategory({ groups });
      if (res.code === 200) {
        message.success($t('排序已保存'));
        onSaved?.();
        onClose();
      } else {
        message.error(res.msg || $t('排序保存失败'));
      }
    } catch (e) {
      message.error($t('排序保存失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={$t('分类排序')}
      visible={open}
      onCancel={onClose}
      onOk={handleSave}
      okText={$t('保存')}
      cancelText={$t('取消')}
      confirmLoading={saving}
      destroyOnClose
      maskClosable={false}
    >
      <Spin spinning={loading}>
        <div
          className={`${styles.sortTree} ${
            dragKey && hoverKey && !hoverValid ? styles.invalidDrop : ''
          }`}
        >
          <Tree
            treeData={decorateNodes(treeData)}
            draggable
            allowDrop={allowDrop}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            blockNode
            defaultExpandAll
            selectable={false}
          />
        </div>
      </Spin>
    </Modal>
  );
}
