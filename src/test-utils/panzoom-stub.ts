import { vi } from "vitest";

/**
 * jsdom 测试环境用的 @panzoom/panzoom 替身（仅 Vitest 经 resolve.alias 注入，生产构建不受影响）。
 *
 * 真实包 `main` 指向 UMD `dist/panzoom.js`，其 `module.exports = { default: fn, defaultOptions }` 且无 `__esModule`，
 * 在 Vitest SSR/CJS 互操作下 `import Panzoom from "@panzoom/panzoom"` 会得到「命名空间对象」而非可调用函数
 * （运行期报错 `default is not a function`）。浏览器走 `module` 字段的 ESM 构建不受影响。
 *
 * 这里只实现 PaperViewport 实际调用的方法（getScale / zoom / reset / zoomWithWheel / resetStyle / destroy），
 * 并用注册表暴露最近创建的实例与入参，供组件测试断言；方法用 vi.fn 保证可 spy。
 */
export interface PzStub {
  getScale: () => number;
  zoom: (scale: number, opts?: unknown) => void;
  reset: (opts?: unknown) => void;
  zoomWithWheel: (event: unknown, opts?: unknown) => void;
  resetStyle: () => void;
  destroy: () => void;
}

const registry: PzStub[] = [];
const lastCalls: Array<{ el: unknown; opts: unknown }> = [];

function createPz(): PzStub {
  let scale = 1;
  const inst: PzStub = {
    getScale: vi.fn(() => scale),
    zoom: vi.fn((s: number) => {
      scale = s;
    }),
    reset: vi.fn(() => {
      scale = 1;
    }),
    zoomWithWheel: vi.fn(),
    resetStyle: vi.fn(),
    destroy: vi.fn(),
  };
  registry.push(inst);
  return inst;
}

// 默认导出：与真实 @panzoom/panzoom 同形（Panzoom(elem, options) => PanzoomObject）。
export default function Panzoom(el: unknown, opts: unknown): PzStub {
  lastCalls.push({ el, opts });
  return createPz();
}

export function __getPz(): PzStub {
  return registry[registry.length - 1];
}

export function __getLastOptions(): unknown {
  return lastCalls[lastCalls.length - 1]?.opts;
}

export function __resetPzRegistry(): void {
  registry.length = 0;
  lastCalls.length = 0;
}
