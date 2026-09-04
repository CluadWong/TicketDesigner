import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GridFormRenderer from "@/components/renderer-v2/GridFormRenderer.vue";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";
import demoData from "@/dev/demoData";
import type { FormDataV2 } from "@/types";

/**
 * A3「统一渲染路径」验收闸门：消费态（非 design）走同一条渲染路径，
 * 即「填充 = 渲染组件 + 数据」，而不是另起一套 DOM。
 *
 * 背景：G11 曾把填写态做成 `<textarea class="layout-p__control">` 分支，导致「浏览/打印看到的版式」
 * 与「填写时的版式」在换行、行高、innerBorder 逐行横线上不一致；十续已回退该分支，
 * 字段统一为可编辑 `<p>`（复合字段为其中的 `.layout-p__input`）。本文件把这条不变式固化成断言，
 * 防止将来再次分化出两套渲染路径。
 *
 * 口径（2026-09-04 内核收拢为 design | preview 两值，与消费态契约一致）：
 * - 内核非设计态仅剩 `preview` 一个值，与旧 `fill` 完全等价（消费态）；
 * - 真正的「不可输入」由 `readonly` 闸门决定，与 `mode` 正交
 *   （`FormRenderer` 默认 `readonly=true` 只读回显、显式 `readonly=false` 进入填写态；设计器预览态显式传 `:readonly="false"`）。
 * 故本文件锁一条核心不变式：**非设计态渲染结果只受 `readonly` 闸门影响，且差异仅限 `contenteditable`**。
 *
 * 设计态（design）不在此不变式内：它无 data、字段显示 `default` 占位，且按 A2 拍板
 * 保留 contenteditable 就地输入以查看交互效果，与交付态本就不同源。
 */
const schema = makeYunlvSecondTicketFirstFiveRowsSchema();
const data = { ...(demoData as Record<string, unknown>) } as FormDataV2;

type RenderCase = {
  readonly?: boolean;
  paginate?: boolean;
};

function renderHtml({ readonly = false, paginate = false }: RenderCase): string {
  const wrapper = mount(GridFormRenderer, {
    props: { schema, data, mode: "preview", readonly, paginate },
  });
  return wrapper.html();
}

/** 抹掉唯一允许的差异（contenteditable），其余必须逐字符一致。 */
function stripEditable(html: string): string {
  return html.replace(/ contenteditable="true"/g, "");
}

function countEditable(html: string): number {
  return html.match(/ contenteditable="true"/g)?.length ?? 0;
}

function countPages(html: string): number {
  return html.match(/class="grid-form-paper"/g)?.length ?? 0;
}

describe("A3 统一渲染路径：消费态（preview）同构", () => {
  it("可填写（readonly=false）与只读（readonly=true）只差 contenteditable，DOM 结构一致", () => {
    const editable = renderHtml({ readonly: false });
    const readonly = renderHtml({ readonly: true });

    expect(stripEditable(editable)).toBe(stripEditable(readonly));
    // 且确实只差 contenteditable：可填写态每个字段都有，只读态一个都没有
    expect(countEditable(editable)).toBeGreaterThan(0);
    expect(countEditable(readonly)).toBe(0);
  });

  it("消费态不再出现 textarea / input 控件（十续回退 textarea 分支后的统一结构）", () => {
    for (const html of [
      renderHtml({ readonly: false }),
      renderHtml({ readonly: true }),
    ]) {
      expect(html).not.toContain("<textarea");
      expect(html).not.toContain("<input");
      expect(html).not.toContain("layout-p__control");
    }
  });

  it("只读闸门对普通字段与复合字段同口径（无「一类可编辑、一类不可」的割裂）", () => {
    const editable = renderHtml({ readonly: false });
    const readonly = renderHtml({ readonly: true });

    // 样例含复合字段（如「共 ___ 人」）与普通字段，二者在只读下都应失去 contenteditable
    const inputs = (html: string): number =>
      html.match(/class="layout-p__input[^"]*"/g)?.length ?? 0;
    expect(inputs(editable)).toBeGreaterThan(0);
    expect(inputs(editable)).toBe(inputs(readonly));
    expect(readonly).not.toMatch(/class="layout-p__input[^"]*" contenteditable/);
    expect(editable).toMatch(/class="layout-p__input[^"]*" contenteditable="true"/);
  });

  it("分页开启时，只读态 / 填写态的物理页数一致（分页结果不因 readonly 而分叉）", () => {
    const pages = [
      renderHtml({ readonly: false, paginate: true }),
      renderHtml({ readonly: true, paginate: true }),
    ].map(countPages);
    expect(pages[0]).toBeGreaterThan(0);
    expect(pages[1]).toBe(pages[0]);
  });
});
