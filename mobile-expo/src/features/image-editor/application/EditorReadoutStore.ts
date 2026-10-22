import type { EditorState, ImageEditorSession } from './ImageEditorSession';

type Source = Pick<ImageEditorSession, 'getState' | 'subscribe'>;

/** 展示节流只影响标签和列表，编辑事实、最终坐标和保存始终读取原会话。 */
export class EditorReadoutStore {
  private state: EditorState;
  private listeners = new Set<() => void>();
  private disconnect: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastPublished = 0;

  constructor(
    private source: Source,
    private intervalMs = 100
  ) {
    this.state = source.getState();
  }

  getState = () => this.state;
  subscribe = (listener: () => void) => {
    if (!this.listeners.size) {
      this.state = this.source.getState();
      this.lastPublished = performance.now();
      this.disconnect = this.source.subscribe(this.observe);
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.disconnect?.();
        this.disconnect = null;
        this.clearTimer();
      }
    };
  };

  private clearTimer() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
  private publish = () => {
    this.clearTimer();
    const next = this.source.getState();
    if (next === this.state) return;
    this.state = next;
    this.lastPublished = performance.now();
    this.listeners.forEach(listener => listener());
  };
  private observe = () => {
    const next = this.source.getState();
    if (
      !next.dragging ||
      !this.state.dragging ||
      next.selection !== this.state.selection ||
      next.status !== this.state.status
    ) {
      this.publish();
      return;
    }
    const remaining =
      this.intervalMs - (performance.now() - this.lastPublished);
    if (remaining <= 0) this.publish();
    else if (this.timer === null)
      this.timer = setTimeout(this.publish, remaining);
  };
}
