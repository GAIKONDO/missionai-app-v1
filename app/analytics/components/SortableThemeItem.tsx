import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Theme } from '@/lib/orgApi';

interface SortableThemeItemProps {
  theme: Theme;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SortableThemeItem({ 
  theme, 
  onEdit, 
  onDelete 
}: SortableThemeItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: theme.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '16px',
        border: '1px solid #E0E0E0',
        borderRadius: '8px',
        marginBottom: '12px',
        backgroundColor: '#FAFAFA',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
      }}>
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            color: '#6B7280',
            backgroundColor: '#F3F4F6',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E5E7EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F3F4F6';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M7 5h6M7 10h6M7 15h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#1A1A1A',
            marginBottom: '8px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            {theme.title}
          </div>
          {theme.description && (
            <div style={{
              fontSize: '14px',
              color: '#4B5563',
              marginBottom: '8px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              {theme.description}
            </div>
          )}
          {theme.initiativeIds && theme.initiativeIds.length > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#808080',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              関連注力施策: {theme.initiativeIds.length}件
            </div>
          )}
        </div>
        
        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          <button
            type="button"
            onClick={onEdit}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#4262FF',
              backgroundColor: '#F0F4FF',
              border: '1.5px solid #4262FF',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E0E8FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F0F4FF';
            }}
          >
            編集
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#DC2626',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #DC2626',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEE2E2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF2F2';
            }}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

