import { describe, it, expect } from "vitest";
import {
  detectColumnType,
  analyzeDataset,
  suggestChartConfig,
  isValidChartConfig,
} from "../columnInference";

describe("detectColumnType", () => {
  it("should detect numeric columns", () => {
    const values = [100, 200, 300, 400];
    expect(detectColumnType(values)).toBe("numeric");
  });

  it("should detect numeric strings", () => {
    const values = ["100", "200", "300", "400"];
    expect(detectColumnType(values)).toBe("numeric");
  });

  it("should detect temporal columns", () => {
    const values = ["2024-01-01", "2025/01/01", "01/01/2025"];
    expect(detectColumnType(values)).toBe("temporal");
  });

  it("should detect categorical columns", () => {
    const values = ["red", "blue", "green", "red"];
    expect(detectColumnType(values)).toBe("categorical");
  });

  it("should detect boolean columns", () => {
    const values = [true, false, "Y", "n", "Yes", "no", "YES"];
    expect(detectColumnType(values)).toBe("boolean");
  });

  it("should handle empty arrays", () => {
    const values = [] as any[];
    expect(detectColumnType(values)).toBe("unknown");
  });

  it("should handle null values", () => {
    const values = [100, null, 200, undefined, 300];
    expect(detectColumnType(values)).toBe("numeric");
  });
});

describe("analyzeDataset", () => {
  it("should analyze a simple dataset", () => {
    const data = [
      { name: "Alice", age: 25, city: "London" },
      { name: "Bob", age: 30, city: "LA" },
      { name: "Charlie", age: 40, city: "London" },
    ];

    const analysis = analyzeDataset(data);

    expect(analysis).toHaveLength(3);
    expect(analysis[0].name).toBe("name");
    expect(analysis[0].type).toBe("categorical");
    expect(analysis[1].name).toBe("age");
    expect(analysis[1].type).toBe("numeric");
    expect(analysis[2].name).toBe("city");
    expect(analysis[2].type).toBe("categorical");
    expect(analysis[2].distinctCount).toBe(2); // London and LA
  });

  it("should handle empty datasets", () => {
    const empty = [] as any[];
    expect(analyzeDataset(empty)).toEqual([]);
  });
});

describe("suggestChartConfig", () => {
  it("should suggest config for line chart with temporal data", () => {
    const data = [
      { date: "2025-01-01", revenue: 1000 },
      { date: "2025-01-02", revenue: 1500 },
    ];

    const suggestion = suggestChartConfig(data, "line");

    expect(suggestion.xColumn).toBe("date");
    expect(suggestion.yColumn).toBe("revenue");
    expect(suggestion.confidence).toBe("high");
  });

  it("should suggest config for pie chart", () => {
    const data = [
      { category: "A", value: 100 },
      { category: "B", value: 300 },
    ];

    const suggestion = suggestChartConfig(data, "pie");

    expect(suggestion.labelColumn).toBe("category");
    expect(suggestion.valueColumn).toBe("value");
  });
});

describe("isValidChartConfig", () => {
  const testData = [
    { x: 1, y: 100 },
    { x: 2, y: 200 },
  ];

  it("should validate a correct table configuration", () => {
    const config = {
      // of type readonly "table"
      type: "table" as const,
    };

    const result = isValidChartConfig(testData, config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate a correct chart configuration", () => {
    const config = {
      type: "chart" as const,
      chartType: "line" as const,
      xColumn: "x",
      yColumn: "y",
    };

    const result = isValidChartConfig(testData, config);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject missing required fields", () => {
    const config = {
      type: "chart" as const,
      chartType: "line" as const,
      xColumn: "x",
      // Missing yColumn
    };

    const result = isValidChartConfig(testData, config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors).toContain("Y-axis column is required");
  });

  it("should reject non-existent columns", () => {
    const config = {
      type: "chart" as const,
      chartType: "line" as const,
      xColumn: "nonexistent",
      yColumn: "y",
    };

    const result = isValidChartConfig(testData, config);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'X-axis column "nonexistent" does not exist in dataset'
    );
  });
});
