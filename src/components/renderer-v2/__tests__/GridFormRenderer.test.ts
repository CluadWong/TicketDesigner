import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { GridFormRenderer } from "@/components/renderer-v2";
import { makeYunlvSecondTicketFirstFiveRowsSchema } from "@/dev/yunlv-second-ticket-first-five-rows";

describe("GridFormRenderer", () => {
  it("renders the V2 sample as a title grid plus an outer five-row grid with a nested work table", () => {
    const wrapper = mount(GridFormRenderer, {
      props: { schema: makeYunlvSecondTicketFirstFiveRowsSchema() },
    });
    const grids = wrapper.findAll(":scope > .grid-form-paper > .layout-grid");
    expect(grids).toHaveLength(2);
    const table = wrapper.find("table");
    expect(table.exists()).toBe(true);
    expect(wrapper.find("table thead").exists()).toBe(true);
    expect(wrapper.find("table tbody tr td").exists()).toBe(true);
  });
});
