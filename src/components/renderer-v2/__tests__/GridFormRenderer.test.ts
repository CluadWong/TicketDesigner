import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";

describe("GridFormRenderer", () => {
  it("renders the V2 sample as four sibling grids with a work table", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeYunlvSecondTicketFirstFiveRowsSchema() },
    });
    const grids = wrapper.findAll(":scope > .grid-form-paper > .layout-grid");
    expect(grids).toHaveLength(4);
    expect(grids[3]?.find(".layout-p").exists()).toBe(true);
    expect(grids[3]?.find("table thead").exists()).toBe(true);
    expect(grids[3]?.find("table tbody tr td").exists()).toBe(true);
  });
});
