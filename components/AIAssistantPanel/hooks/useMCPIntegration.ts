import { useEffect } from 'react';

/**
 * MCP統合を初期化するフック
 */
export function useMCPIntegration(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      const initMCP = async () => {
        try {
          const { initializeMCP } = await import('@/lib/mcp');
          await initializeMCP();
        } catch (error) {
          console.warn('[useMCPIntegration] MCP初期化エラー:', error);
        }
      };
      initMCP();
    }
  }, [isOpen]);
}

