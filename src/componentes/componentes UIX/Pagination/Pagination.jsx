import React from 'react';
import './Pagination.css';

export const Pagination = ({
  currentPage,
  totalPages,
  onChange,
  siblingCount = 1,
  className = '',
}) => {
  // Generate page numbers to be displayed
  const getPageNumbers = () => {
    const totalPageNumbers = siblingCount * 2 + 3; // siblings + first + current + last + ellipsis
    
    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
    
    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;
    
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 1 + 2 * siblingCount;
      return [...Array.from({ length: leftItemCount }, (_, i) => i + 1), '...', totalPages];
    }
    
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 1 + 2 * siblingCount;
      return [1, '...', ...Array.from(
        { length: rightItemCount }, 
        (_, i) => totalPages - rightItemCount + i + 1
      )];
    }
    
    if (shouldShowLeftDots && shouldShowRightDots) {
      return [
        1,
        '...',
        ...Array.from(
          { length: rightSiblingIndex - leftSiblingIndex + 1 },
          (_, i) => leftSiblingIndex + i
        ),
        '...',
        totalPages
      ];
    }
  };

  const pages = getPageNumbers();

  return (
    <div className={`pagination ${className}`}>
      <button
        className="pagination-item"
        disabled={currentPage === 1}
        onClick={() => onChange(currentPage - 1)}
      >
        &laquo;
      </button>
      
      {pages.map((page, index) => {
        if (page === '...') {
          return <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>;
        }
        return (
          <button
            key={page}
            className={`pagination-item ${currentPage === page ? 'pagination-active' : ''}`}
            onClick={() => onChange(page)}
          >
            {page}
          </button>
        );
      })}
      
      <button
        className="pagination-item"
        disabled={currentPage === totalPages}
        onClick={() => onChange(currentPage + 1)}
      >
        &raquo;
      </button>
    </div>
  );
};