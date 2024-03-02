import { expect, describe, test } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NumberInput } from "./NumberInput";

describe("NumberInput", () => {
  test("should accept any text input but emit value only when it's valid", () => {
    let value = 123;
    render(<NumberInput value={value} onChange={(v) => (value = v)} />);

    const inputElm = screen.getByRole<HTMLInputElement>("textbox");
    expect(inputElm.value).toBe("123");
    expect(value).toBe(123);

    fireEvent.input(inputElm, { target: { value: "321" } });
    expect(inputElm.value).toBe("321");
    expect(value).toBe(321);

    fireEvent.input(inputElm, { target: { value: "3.21" } });
    expect(inputElm.value).toBe("3.21");
    expect(value).toBe(3.21);

    fireEvent.input(inputElm, { target: { value: "a" } });
    expect(inputElm.value).toBe("a");
    expect(value).toBe(3.21);

    fireEvent.input(inputElm, { target: { value: "" } });
    expect(inputElm.value).toBe("");
    expect(value).toBe(3.21);

    fireEvent.input(inputElm, { target: { value: "-" } });
    expect(inputElm.value).toBe("-");
    expect(value).toBe(3.21);

    fireEvent.input(inputElm, { target: { value: "-1" } });
    expect(inputElm.value).toBe("-1");
    expect(value).toBe(-1);
  });
});
