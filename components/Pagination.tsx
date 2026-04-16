
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  label: string;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage,
  label
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first 3 pages
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, '...', totalPages - 2, totalPages - 1, totalPages);
      } 
      // Always show last 3 pages if we are near the end
      else if (currentPage >= totalPages - 3) {
        pages.push(1, 2, 3, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      }
      // Show middle context
      else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="p-4 border-t border-slds-border flex flex-col sm:flex-row items-center justify-between bg-slds-bg gap-4">
      <div className="text-[10px] font-bold text-slds-text-secondary uppercase tracking-widest">
        Affichage de <span className="text-slds-brand">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</span> à <span className="text-slds-brand">{Math.min(totalItems, currentPage * itemsPerPage)}</span> sur <span className="text-slds-brand">{totalItems}</span> {label}
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded border border-slds-border bg-white text-[10px] font-black uppercase tracking-tighter text-slds-text-primary disabled:opacity-30 hover:bg-slds-bg transition-all"
        >
          Précédent
        </button>
        
        <div className="flex items-center gap-1 mx-2">
          {visiblePages.map((page, index) => (
            page === '...' ? (
              <span key={`dots-${index}`} className="px-2 text-slds-text-secondary font-bold">...</span>
            ) : (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page as number)}
                className={`w-8 h-8 rounded border text-[10px] font-black transition-all ${
                  currentPage === page 
                    ? 'bg-slds-brand text-white border-slds-brand shadow-md scale-105' 
                    : 'bg-white text-slds-text-primary border-slds-border hover:border-slds-brand hover:text-slds-brand'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded border border-slds-border bg-white text-[10px] font-black uppercase tracking-tighter text-slds-text-primary disabled:opacity-30 hover:bg-slds-bg transition-all"
        >
          Suivant
        </button>
      </div>
    </div>
  );
};

export default Pagination;
