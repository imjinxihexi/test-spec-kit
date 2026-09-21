import CategoryTreeLayout from '@/pages/Category/components/CategoryTreeLayout';
import { CourseListTable } from './components';

export default function CourseList() {
  return (
    <CategoryTreeLayout
      renderContent={(selectedNodeId) => (
        <CourseListTable
          selectedCategoryId={selectedNodeId}
        />
      )}
      leftSpan={4}
      rightSpan={20}
    />
  );
}
