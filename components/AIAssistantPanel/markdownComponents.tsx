import React from 'react';

export const markdownComponents = {
  a: ({ node, ...props }: any) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#60A5FA', textDecoration: 'underline' }}
    />
  ),
  p: ({ node, ...props }: any) => (
    <p {...props} style={{ margin: '0 0 8px 0' }} />
  ),
  h1: ({ node, ...props }: any) => (
    <h1 {...props} style={{ fontSize: '20px', fontWeight: 600, margin: '16px 0 8px 0' }} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 {...props} style={{ fontSize: '18px', fontWeight: 600, margin: '14px 0 8px 0' }} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 {...props} style={{ fontSize: '16px', fontWeight: 600, margin: '12px 0 6px 0' }} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul {...props} style={{ margin: '8px 0', paddingLeft: '20px' }} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol {...props} style={{ margin: '8px 0', paddingLeft: '20px' }} />
  ),
  li: ({ node, ...props }: any) => (
    <li {...props} style={{ margin: '4px 0' }} />
  ),
  code: ({ node, inline, ...props }: any) => (
    <code
      {...props}
      style={{
        backgroundColor: inline ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
        padding: inline ? '2px 6px' : '12px',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'monospace',
        display: inline ? 'inline' : 'block',
        overflowX: 'auto',
      }}
    />
  ),
  pre: ({ node, ...props }: any) => (
    <pre {...props} style={{ margin: '8px 0', overflowX: 'auto' }} />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      {...props}
      style={{
        borderLeft: '3px solid rgba(255, 255, 255, 0.3)',
        paddingLeft: '12px',
        margin: '8px 0',
        color: 'rgba(255, 255, 255, 0.8)',
      }}
    />
  ),
  hr: ({ node, ...props }: any) => (
    <hr {...props} style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '16px 0' }} />
  ),
  table: ({ node, ...props }: any) => (
    <table {...props} style={{ borderCollapse: 'collapse', width: '100%', margin: '8px 0' }} />
  ),
  th: ({ node, ...props }: any) => (
    <th {...props} style={{ border: '1px solid rgba(255, 255, 255, 0.2)', padding: '8px', textAlign: 'left' }} />
  ),
  td: ({ node, ...props }: any) => (
    <td {...props} style={{ border: '1px solid rgba(255, 255, 255, 0.2)', padding: '8px' }} />
  ),
};

