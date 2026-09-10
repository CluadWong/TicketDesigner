import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { FormDataV2, FormSchemaV2, ImageNodeV2 } from "@/types";
import { GridSchemaNode } from "@/components/renderer-v2";
import { paginateSchema } from "@/engine-v2/pagination";

/**
 * 无来源图片（没配 `src`、也没配 `field`，或配了 `field` 但数据里没值）：
 * 屏幕上保留占位灰框（设计态要靠它选中 / 编辑），但 **打印时不占版面**。
 *
 * 判定的唯一真相源是 `engine-v2/derivation.resolveImageSourceV2`——渲染层与
 * 分页引擎共用，否则会出现「图片没打印出来、却多出一张空白纸」。
 * 本文件锁三件事：① 无来源 → 带 `layout-image--blank`（@media print 隐藏）；
 * ② 有来源 → 不带该类；③ 配了 field 且数据给值时即使无 src 也算有来源。
 */
function imageNode(overrides: Partial<ImageNodeV2> = {}): ImageNodeV2 {
  return {
    id: "img-1",
    type: "image",
    src: "data:image/png;base64,AAAA",
    height: 30,
    ...overrides,
  } as ImageNodeV2;
}

function render(node: ImageNodeV2, data: Record<string, unknown> = {}) {
  return mount(GridSchemaNode, {
    props: {
      node,
      data: data as FormDataV2,
      baseRowHeight: 8,
      mode: "preview",
      readonly: true,
    },
  });
}

const BLANK = "layout-image--blank";

describe("无来源图片：屏幕占位、打印不占版面", () => {
  it("既无 src 也无 field → 带 blank 标记（打印时隐藏）", () => {
    const img = render(imageNode({ src: undefined, field: undefined })).find("img");
    expect(img.classes()).toContain(BLANK);
    // 仍然是占位图，屏幕上看得见
    expect(img.attributes("src")).toContain("data:image/svg+xml");
  });

  it("有 src → 不带 blank 标记", () => {
    const img = render(imageNode({ src: "data:image/png;base64,AAAA" })).find("img");
    expect(img.classes()).not.toContain(BLANK);
  });

  it("无 src 但配了 field，且数据给了值 → 算有来源，不带 blank 标记", () => {
    const img = render(imageNode({ src: undefined, field: "photo" }), {
      photo: "https://example.com/a.png",
    }).find("img");
    expect(img.classes()).not.toContain(BLANK);
    expect(img.attributes("src")).toBe("https://example.com/a.png");
  });

  it("无 src 且配了 field 但数据里没值 → 仍算无来源，带 blank 标记", () => {
    const img = render(imageNode({ src: undefined, field: "photo" }), {}).find("img");
    expect(img.classes()).toContain(BLANK);
  });

  it("无来源时仍渲染占位图（屏幕可见），隐藏仅由 CSS @media print 负责", () => {
    const img = render(imageNode({ src: undefined })).find("img");
    expect(img.attributes("src")).toContain("data:image/svg+xml");
  });
});

/** 一页 277mm 可用（A4 297 − 上下边距 10×2）；先放一个约 248mm 的 Grid，再放图片。 */
function schemaWithTrailingImage(node: ImageNodeV2): FormSchemaV2 {
  return {
    version: 2,
    paper: { size: "A4" },
    baseRowHeight: 8,
    pages: [
      {
        id: "page-1",
        type: "page",
        mode: "fixed",
        margin: { top: 10, right: 5, bottom: 10, left: 5 },
        children: [
          {
            id: "g-1",
            type: "grid",
            border: "none",
            columns: ["1fr"],
            rows: [
              {
                id: "r-1",
                height: 31, // 31 × 8 = 248mm
                cells: [{ id: "c-1", type: "grid-cell", children: [] }],
              },
            ],
          },
          node,
        ],
      },
    ],
  } as unknown as FormSchemaV2;
}

describe("分页高度与打印口径一致（无来源图片不占高度）", () => {
  it("有来源的 100mm 图片：248+100 超过一页 → 2 页", () => {
    const r = paginateSchema(
      schemaWithTrailingImage(imageNode({ src: "data:image/png;base64,AAAA", height: 100 })),
    );
    expect(r.pages.length).toBe(2);
  });

  it("同一张图但没配地址：打印时隐藏、分页按 0 计 → 仍是 1 页（不多出空白纸）", () => {
    const r = paginateSchema(
      schemaWithTrailingImage(imageNode({ src: undefined, field: undefined, height: 100 })),
    );
    expect(r.pages.length).toBe(1);
  });
});

