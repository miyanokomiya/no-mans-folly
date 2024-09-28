import { expect, describe, test, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ContextMenu } from "./ContextMenu";
import { ContextMenuItem } from "../composables/states/types";

describe("NumberInput", () => {
  beforeEach(() => {
    cleanup();
  });

  const items: ContextMenuItem[] = [
    { key: "root0", label: "label_root0" },
    { key: "root1", label: "label_root1" },
    {
      key: "root2",
      label: "label_root2",
      children: [
        { key: "root2_child0", label: "label_root2_child0" },
        { key: "root2_child1", label: "label_root2_child1" },
      ],
    },
    {
      key: "root3",
      label: "label_root3",
      children: [
        {
          key: "root3_child0",
          label: "label_root3_child0",
          children: [{ key: "root3_child0_child0", label: "label_root3_child0_child0" }],
        },
      ],
    },
  ];

  test("should toggle children panel when a parent element is clicked", () => {
    render(<ContextMenu items={items} point={{ x: 0, y: 0 }} />);

    expect(screen.queryByText("label_root2_child0")).toBe(null);
    expect(screen.queryByText("label_root2_child1")).toBe(null);

    fireEvent.click(screen.getByText("label_root2"));
    expect(screen.queryByText("label_root2_child0")).not.toBe(null);
    expect(screen.queryByText("label_root2_child1")).not.toBe(null);

    fireEvent.click(screen.getByText("label_root2"));
    expect(screen.queryByText("label_root2_child0")).toBe(null);
    expect(screen.queryByText("label_root2_child1")).toBe(null);
  });

  test("should close the dropdown when other dropdown in the same level opens", () => {
    render(<ContextMenu items={items} point={{ x: 0, y: 0 }} />);

    fireEvent.click(screen.getByText("label_root2"));
    fireEvent.click(screen.getByText("label_root3"));
    expect(screen.queryByText("label_root2_child0")).toBe(null);
    expect(screen.queryByText("label_root3_child0")).not.toBe(null);
    expect(screen.queryByText("label_root3_child0_child0")).toBe(null);

    fireEvent.click(screen.getByText("label_root3_child0"));
    expect(screen.queryByText("label_root3_child0_child0")).not.toBe(null);
  });

  test("should execute onClickItem with a childless item when it's clicked", () => {
    const keys: string[] = [];
    const onClickItem = (key: string) => keys.push(key);
    render(<ContextMenu items={items} point={{ x: 0, y: 0 }} onClickItem={onClickItem} />);

    expect(keys).toHaveLength(0);
    fireEvent.click(screen.getByText("label_root0"));
    expect(keys).toContain("root0");
    fireEvent.click(screen.getByText("label_root1"));
    expect(keys).toContain("root1");

    fireEvent.click(screen.getByText("label_root2"));
    expect(keys, "this element has children").not.toContain("root2");
    fireEvent.click(screen.getByText("label_root2_child0"));
    expect(keys).toContain("root2_child0");

    fireEvent.click(screen.getByText("label_root3"));
    expect(keys, "this element has children").not.toContain("root3");
    fireEvent.click(screen.getByText("label_root3_child0"));
    expect(keys, "this element has children").not.toContain("root3_child0");
    fireEvent.click(screen.getByText("label_root3_child0_child0"));
    expect(keys).toContain("root3_child0_child0");
  });
});
