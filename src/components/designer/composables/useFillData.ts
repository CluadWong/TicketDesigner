/**
 * 填充数据（预览态）生命周期：预览数据本身 + 导入 / 导出 / 存本地 / 读本地。
 *
 * 从 `DesignerApp.vue` 抽出（2026-09-07 批次 1 拆分）：只管「表单数据」，
 * 与 schema 存储键隔离（`DATA_STORAGE_KEY` vs `SCHEMA_STORAGE_KEY`）。
 *
 * 导出 / 保存只在预览态可用：值由渲染 DOM 遍历采集（`collectFieldValues`），
 * 设计态没有真实填写值。
 */
import { computed, reactive, ref, type Ref } from "vue";
import type { FormDataV2 } from "@/types";
import { collectFieldValues } from "@/components/renderer-v2";

export const DATA_STORAGE_KEY = "ticket-designer-fill-data-v2";

export type FillData = ReturnType<typeof useFillData>;

export function useFillData(options: {
  /** 画布根元素：导出/保存时遍历其 DOM 采集填写值。 */
  canvasEl: Ref<HTMLElement | null>;
  /** 是否处于预览态（导出 / 保存的闸门）。 */
  isPreview: () => boolean;
  /** 载入数据并进入预览态（含清选中），由宿主编排。 */
  enterPreview: (data: FormDataV2) => void;
}) {
  const previewFormData = reactive<{ value: FormDataV2 | null }>({ value: null });
  const previewData = computed<FormDataV2 | null>(() => previewFormData.value);
  const fillDataFileInput = ref<HTMLInputElement | null>(null);

  /** 填充数据导入：解析 FormDataV2 JSON 并进入预览态展示填写结果。 */
  function importFillDataFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as FormDataV2;
        // 走 enterPreview 而非直接改 viewMode：避免宿主用种子数据覆盖刚导入的数据。
        options.enterPreview(parsed);
      } catch (error) {
        alert(`导入数据失败：${error instanceof Error ? error.message : String(error)}`);
      } finally {
        input.value = "";
      }
    };
    reader.onerror = () => {
      alert("数据文件读取失败");
      input.value = "";
    };
    reader.readAsText(file);
  }

  function triggerImportFillData(): void {
    fillDataFileInput.value?.click();
  }

  /** 填充数据导出：遍历渲染 DOM 采集当前填写值并下载 JSON。仅预览态可用。 */
  function exportFillDataFile(): void {
    const root = options.canvasEl.value;
    if (!root || !options.isPreview()) return;
    try {
      const values = collectFieldValues(root);
      const blob = new Blob([JSON.stringify(values, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ticket-fill-data-${Date.now()}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`导出数据失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** 保存当前填写数据到本地（仅数据，与 schema 存储键隔离）。 */
  function saveFillDataToLocal(): void {
    const root = options.canvasEl.value;
    if (!root || !options.isPreview()) return;
    try {
      localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(collectFieldValues(root)));
    } catch (error) {
      alert(`保存数据失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** 从本地读取填写数据并进入预览态。 */
  function loadFillDataFromLocal(): void {
    const text = localStorage.getItem(DATA_STORAGE_KEY);
    if (!text) {
      alert("本地没有已保存的填写数据");
      return;
    }
    try {
      options.enterPreview(JSON.parse(text) as FormDataV2);
    } catch (error) {
      alert(`读取数据失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    previewFormData,
    previewData,
    fillDataFileInput,
    importFillDataFile,
    triggerImportFillData,
    exportFillDataFile,
    saveFillDataToLocal,
    loadFillDataFromLocal,
  };
}
