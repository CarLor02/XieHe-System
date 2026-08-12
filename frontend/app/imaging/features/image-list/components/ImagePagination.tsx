interface ImagePaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
  onChangePage: (updater: (page: number) => number) => void;
}

export default function ImagePagination({
  total,
  pageSize,
  currentPage,
  onChangePage,
}: ImagePaginationProps) {
  if (total <= pageSize) return null;

  return (
    <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-white">
      <div className="text-sm text-gray-700">
        显示{' '}
        <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>{' '}
        到{' '}
        <span className="font-medium">
          {Math.min(currentPage * pageSize, total)}
        </span>{' '}
        条， 共 <span className="font-medium">{total}</span> 条
      </div>
      <div className="max-w-full overflow-x-auto">
        <PaginationControls
          currentPage={currentPage}
          totalPages={Math.ceil(total / pageSize)}
          onPageChange={page => onChangePage(() => page)}
          pageInputLabel="影像页码"
        />
      </div>
    </div>
  );
}
import PaginationControls from '@/components/common/PaginationControls';
