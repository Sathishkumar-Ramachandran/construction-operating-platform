import { describe, expect, it } from "vitest";
import { formatEmployeeNumber } from "@/lib/services/employee-number-service";

describe("formatEmployeeNumber", () => {
  it("pads to 5 digits with the EXL-EMP- prefix", () => {
    expect(formatEmployeeNumber(1)).toBe("EXL-EMP-00001");
    expect(formatEmployeeNumber(42)).toBe("EXL-EMP-00042");
    expect(formatEmployeeNumber(99999)).toBe("EXL-EMP-99999");
  });

  it("does not truncate numbers wider than the pad width", () => {
    expect(formatEmployeeNumber(123456)).toBe("EXL-EMP-123456");
  });
});
