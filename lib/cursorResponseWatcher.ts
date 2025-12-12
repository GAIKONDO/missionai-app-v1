/**
 * Cursor応答監視ユーティリティ
 * 
 * WebSocket経由でCursorの応答（ファイル変更）を監視します
 */

export interface FileChangeEvent {
  type: 'file_changed' | 'file_added';
  instructionId: string;
  filePath: string;
  fullPath: string;
  timestamp: string;
  size: number;
  modified: string;
  preview: string;
}

export interface CursorResponseWatcherOptions {
  instructionId: string;
  wsUrl?: string;
  onFileChange?: (event: FileChangeEvent) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export class CursorResponseWatcher {
  private ws: WebSocket | null = null;
  private instructionId: string;
  private wsUrl: string;
  private onFileChange?: (event: FileChangeEvent) => void;
  private onError?: (error: Error) => void;
  private onConnected?: () => void;
  private onDisconnected?: () => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(options: CursorResponseWatcherOptions) {
    this.instructionId = options.instructionId;
    this.wsUrl = options.wsUrl || 'ws://127.0.0.1:9998';
    this.onFileChange = options.onFileChange;
    this.onError = options.onError;
    this.onConnected = options.onConnected;
    this.onDisconnected = options.onDisconnected;
  }

  /**
   * WebSocket接続を開始
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          
          // 監視セッションに参加
          if (this.ws) {
            this.ws.send(JSON.stringify({
              type: 'subscribe',
              instructionId: this.instructionId,
            }));
          }

          if (this.onConnected) {
            this.onConnected();
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'file_changed' || data.type === 'file_added') {
              if (this.onFileChange) {
                this.onFileChange(data as FileChangeEvent);
              }
            } else if (data.type === 'subscribed') {
              console.log('Subscribed to instruction:', data.instructionId);
            } else if (data.type === 'error') {
              console.error('WebSocket error:', data.message);
              if (this.onError) {
                this.onError(new Error(data.message));
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            if (this.onError) {
              this.onError(error instanceof Error ? error : new Error(String(error)));
            }
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.onError) {
            this.onError(new Error('WebSocket connection error'));
          }
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          if (this.onDisconnected) {
            this.onDisconnected();
          }

          // 再接続を試みる
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
              this.connect().catch(() => {
                // 再接続失敗は無視（onErrorで処理）
              });
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * WebSocket接続を切断
   */
  disconnect(): void {
    if (this.ws) {
      // 監視セッションから退出
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        instructionId: this.instructionId,
      }));

      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 接続状態を確認
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

