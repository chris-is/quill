// Result of analyzing a single column
export interface ColumnAnalysis {
  name: string;
  type: "temporal" | "numeric" | "categorical" | "boolean" | "unknown";
  distinctCount: number;
  nullCount: number;
  sampleValues: any[]; // First 5 values for preview
  inferredFormat?: string; // For dates: "YYYY-MM-DD", etc.
}

// Suggested configuration for a chart
export interface ConfigSuggestion {
  xColumn: string | null;
  yColumn: string | null;
  labelColumn?: string | null; // for pie charts
  valueColumn?: string | null; // for pie charts
  confidence: "low" | "medium" | "high";
  reasoning: string; // Human-readable string explanation
}

// Result of validating a chart configuration
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[]; // non-blocking warnings
}

/**
 * Detects the type of a column by analyzing its values
 * @param values - Array of values from a single column
 * @returns The detected column type
 *
 * @example
 * detectColumnType(["2024-01-01", "2024-10-08"]) // returns "temporal" as it"s in "YYYY-MM-DD" format
 * detectColumnType([100, 200, 300]) // returns "numeric" since all integers
 */
export function detectColumnType(
  values: any[]
): "temporal" | "numeric" | "categorical" | "boolean" | "unknown" {
  // Filter out null/undefined values for analysis
  const validValues = values.filter(
    (v) => v !== null && v !== undefined && v !== ""
  );

  if (validValues.length === 0) {
    return "unknown";
  }

  // Take a random sample to analyze
  const sample = pickRandomElements(values);

  // Check for boolean type
  if (isBoolean(sample)) {
    return "boolean";
  }

  // Check for temporal (date/time) type
  if (isTemporal(sample)) {
    return "temporal";
  }

  // Check for numeric type
  if (isNumeric(sample)) {
    return "numeric";
  }

  // Check if categorical (limited distinct values)
  const distinctCount = new Set(sample).size;
  const distinctRatio = distinctCount / sample.length;

  // If less than 50% distinct values, likely categorical
  if (distinctRatio < 0.5) {
    return "categorical";
  }

  // Default to categorical for text
  return "categorical";
}

// Pick 100 elements from a list, or all elements if it has exactly 100 or fewer elements
function pickRandomElements<T>(arr: T[]): T[] {
  if (arr.length <= 100) return arr;

  // Shuffle array using Fisher-Yates algorithm
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 100);
}

function isBoolean(values: any[]): boolean {
  const booleanValues = new Set([
    true,
    false,
    "true",
    "false",
    "True",
    "False",
    "TRUE",
    "FALSE",
    "t",
    "f",
    "T",
    "F",
    1,
    0,
    "1",
    "0",
    "yes",
    "no",
    "YES",
    "NO",
    "Yes",
    "No",
    "y",
    "n",
    "Y",
    "N",
  ]);
  let booleanCount = 0;
  values.map((value) => {
    booleanValues.has(value) && booleanCount++;
  });
  // True if at least 80% of values detected as bools
  return booleanCount / values.length >= 0.8;
}

function isTemporal(values: any[]): boolean {
  let dateCount = 0;
  values.map((value) => {
    if (value instanceof Date && !isNaN(value.getTime())) {
      dateCount++;
    } else {
      // Try parsing as date
      const timeStr = String(value);

      // Common date patterns
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/, // 2025-01-01
        /^\d{2}\/\d{2}\/\d{4}$/, // 01/01/2025
        /^\d{4}\/\d{2}\/\d{2}$/, // 2025/01/01
        /^\d{4}-\d{2}-\d{2}T/, // ISO 8601
      ];

      const matchesPattern = datePatterns.some((pattern) =>
        pattern.test(timeStr)
      );
      if (matchesPattern) {
        const parsed = new Date(timeStr);
        if (!isNaN(parsed.getTime())) {
          dateCount++;
        }
      }
    }
  });
  // True if at least 80% of values detected as valid dates
  return dateCount / values.length >= 0.8;
}

function isNumeric(values: any[]): boolean {
  let numericCount = 0;
  values.map((value) => {
    if (typeof value === "number" && !isNaN(value)) {
      numericCount++;
    } else {
      // Try parsing as number
      const num = Number(value);
      if (!isNaN(num) && value !== "") {
        numericCount++;
      }
    }
  });
  // True if at least 80% of values detected as valid numbers (int, float)
  return numericCount / values.length >= 0.8;
}

/**
 * Analyzes an entire dataset and returns information about each column
 *
 * @param data - Array of objects (rows from DuckDB query)
 * @returns Analysis for each column
 *
 * @example
 * const data = [
 *  {name: "Alice", age: 25, date: "2025-10-10"},
 *  {name: "Bob", age: 30, date: "2025-10-11},
 * ];
 * const analysis = analyzeDataset(data);
 * // Returns analysis for "name", "age" and "date" columns
 */
export function analyzeDataset(data: any[]): ColumnAnalysis[] {
  if (!data || data.length === 0) {
    return [];
  }

  // Get all column from the first row
  const firstRow = data[0];
  const columnNames = Object.keys(firstRow);

  // Analyze each column
  return columnNames.map((columnName) => {
    // Extract all values for this column
    const values = data.map((row) => row[columnName]);
    // Detect the column type
    const columnType = detectColumnType(values);

    // Count distinct values
    const distinctValues = new Set(
      values.filter((v) => v !== null && v !== undefined)
    );
    const distinctCount = distinctValues.size;

    // Count null values
    const nullCount = values.filter(
      (v) => v === null || v === undefined || v === ""
    ).length;

    // Get sample values (first 5 non-null values)
    const sampleValues = values
      .filter((v) => v !== null && v !== undefined && v !== "")
      .slice(0, 5);

    return {
      name: columnName,
      type: columnType,
      distinctCount: distinctCount,
      nullCount: nullCount,
      sampleValues: sampleValues,
    };
  });
}

// ============================================================================
// CHART CONFIGURATION SUGGESTIONS
// ============================================================================

/**
 * Suggests optimal column configuration for a given chart type
 *
 * @param data - The dataset to analyze
 * @param chartType - The type of chart ("bar", "line", "pie", "area")
 * @returns Suggested configuration with reasoning
 */
export function suggestChartConfig(
  data: any[],
  // TODO: store this elsewhere universally, then import where needed
  chartType: "bar" | "line" | "pie" | "area"
): ConfigSuggestion {
  const analysis = analyzeDataset(data);

  if (analysis.length === 0) {
    return {
      xColumn: null,
      yColumn: null,
      confidence: "low",
      reasoning: "No data available to analyze",
    };
  }

  // Separate columns by type
  const temporalColumns = analysis.filter((col) => col.type === "temporal");
  const numericColumns = analysis.filter((col) => col.type === "numeric");
  const categoricalColumns = analysis.filter(
    (col) => col.type === "categorical"
  );

  switch (chartType) {
    case "line":
    case "area":
      return suggestTimeSeriesConfig(
        temporalColumns,
        numericColumns,
        chartType
      );
    case "bar":
      return suggestBarConfig(
        categoricalColumns,
        numericColumns,
        temporalColumns
      );
    case "pie":
      return suggestPieConfig(categoricalColumns, numericColumns);
    default:
      return {
        xColumn: null,
        yColumn: null,
        confidence: "low",
        reasoning: "Unknown chart type",
      };
  }
}

// Suggests config for line/area charts (typically time series)
function suggestTimeSeriesConfig(
  temporalColumns: ColumnAnalysis[],
  numericColumns: ColumnAnalysis[],
  chartType: "line" | "area"
): ConfigSuggestion {
  // Prefer temporal column for X-axis
  const xColumn = temporalColumns[0];
  const yColumn = numericColumns[0];

  if (xColumn && yColumn) {
    return {
      xColumn: xColumn.name,
      yColumn: yColumn.name,
      confidence: "high",
      reasoning: `${chartType} charts work well with time (${xColumn.name}) on X-axis and numeric values (${yColumn.name}) on Y-axis`,
    };
  }

  return {
    xColumn: null,
    yColumn: null,
    confidence: "low",
    reasoning: "Need at least one date column and one numeric column",
  };
}

// Suggests config for bar charts
function suggestBarConfig(
  categoricalColumns: ColumnAnalysis[],
  numericColumns: ColumnAnalysis[],
  temporalColumns: ColumnAnalysis[]
): ConfigSuggestion {
  const firstCategorical = categoricalColumns[0];
  const firstTemporal = temporalColumns[0];
  const yColumn = numericColumns[0];

  if (firstCategorical && yColumn) {
    return {
      xColumn: firstCategorical.name,
      yColumn: yColumn.name,
      confidence: "high",
      reasoning: `Bar charts work well with categorical (${firstCategorical.name}) on X-axis and numeric values (${yColumn.name}) on Y-axis.`,
    };
  }

  if (firstTemporal && yColumn) {
    return {
      xColumn: firstTemporal.name,
      yColumn: yColumn.name,
      confidence: "medium",
      reasoning: `Bar charts work reasonably with temporal (${firstTemporal.name}) on X-axis and numeric values (${yColumn.name}) on Y-axis.`,
    };
  }

  return {
    xColumn: null,
    yColumn: null,
    confidence: "low",
    reasoning:
      "Need at least one temporal or categorical column and one numeric column",
  };
}

// Suggests config for pie charts
function suggestPieConfig(
  categoricalColumns: ColumnAnalysis[],
  numericColumns: ColumnAnalysis[]
): ConfigSuggestion {
  const labelColumn = categoricalColumns[0];
  const valueColumn = numericColumns[0];

  if (labelColumn && valueColumn) {
    return {
      xColumn: null,
      yColumn: null,
      labelColumn: labelColumn.name,
      valueColumn: valueColumn.name,
      confidence: "high",
      reasoning: `Pie charts work well with category (${labelColumn.name}) and numeric values (${valueColumn.name})`,
    };
  }

  return {
    xColumn: null,
    yColumn: null,
    confidence: "low",
    reasoning: "Need at least one categorical column and one numeric column",
  };
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================
/**
 * Validates a chart configuration against the actual data
 *
 * @param data - The dataset
 * @param config - The configuration to validate
 * @returns Validation result with errors and warnings
 */
export function isValidChartConfig(
  data: any[],
  config: {
    type: "chart" | "table";
    chartType?: "bar" | "line" | "pie" | "area";
    xColumn?: string;
    yColumn?: string;
    labelColumn?: string;
    valueColumn?: string;
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || data.length === 0) {
    errors.push("Dataset is empty");
    return { isValid: false, errors, warnings };
  }

  const analysis = analyzeDataset(data);
  const columnNames = analysis.map((col) => col.name);

  // Validate based on widget type
  if (config.type === "table") {
    // Tables are always valid
    return { isValid: true, errors, warnings };
  }

  // Validate chart configuration
  if (config.type === "chart") {
    if (!config.chartType) {
      errors.push("Chart type is required");
    }

    if (config.chartType === "pie") {
      // Pie charts need label and value columns
      if (!config.labelColumn) {
        errors.push("Label column is required for pie charts");
      } else if (!columnNames.includes(config.labelColumn)) {
        errors.push(
          `Label column "${config.labelColumn}" does not exist in dataset`
        );
      }

      if (!config.valueColumn) {
        errors.push("Value column is required for pie charts");
      } else if (!columnNames.includes(config.valueColumn)) {
        errors.push(
          `Value column "${config.valueColumn}" does not exist in dataset`
        );
      }
    } else {
      // Bar, line, area charts need X and Y columns
      if (!config.xColumn) {
        errors.push("X-axis column is required");
      } else if (!columnNames.includes(config.xColumn)) {
        errors.push(
          `X-axis column "${config.xColumn}" does not exist in dataset`
        );
      }

      if (!config.yColumn) {
        errors.push("Y-axis column is required");
      } else if (!columnNames.includes(config.yColumn)) {
        errors.push(
          `Y-axis column "${config.yColumn}" does not exist in dataset`
        );
      }

      const yColumnType = analysis.filter(
        (col) => col.name === config.yColumn
      )[0].type;
      if (config.chartType === "line" && yColumnType === "categorical") {
        warnings.push("Y-axis column in a line chart typically numeric");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
