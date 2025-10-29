/**
 * Shared styles and constatnts for all chart components
 *
 * This file defines the visual language of our charts:
 * colors, spacing, fonts, and animations.
 */

// ============================================
// COLOR PALETTES
// ============================================

// Primary color palette for charts
export const chartColors = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  tertiary: "#06b6d4",
  accent: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",

  // Gradient variations (for bars, areas)
  primaryGradient: ["#3b82f6", "#60a5fa"],
  secondaryGradient: ["#8b5cf6", "#a78bfa"],

  // UI colors
  grid: "#e5e7eb",
  axis: "#6b7280",
  tooltip: "#1f2937",
  background: "#ffffff",
};

// Multi-color palette for charts with many data series
export const multiSeriesColors = [
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

// ============================================
// TYPOGRAPHY
// ============================================

export const chartTypography = {
  fontSize: {
    small: 11,
    medium: 12,
    large: 14,
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontWeight: {
    normal: 400,
    medium: 500,
    bold: 600,
  },
};

// ============================================
// SPACING & LAYOUT
// ============================================

export const chartLayout = {
  margin: {
    top: 20,
    right: 30,
    bottom: 20,
    left: 20,
  },
  padding: 16,
  minHeight: 300,
};

// ============================================
// ANIMATION
// ============================================

export const chartAnimation = {
  duration: 300, // Animation duration in ms
  easing: "ease-in-out", // Animation timing function
};

// ============================================
// ACCESSIBILITY
// ============================================

/**
 * Ensures text meets WCAG AA contrast requirements
 */
export const accessibleTextColor = (backgroundColor: string): string => {
  // CIXX TODO: implement contrast calculation for dynamic backgrounds
  return "#1f2937";
};

/**
 * Formats large numbers in a human-readable way
 * 100 -> 1K, 1000000 -> 1M, etc.
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000000000) {
    return `${(value / 1000000000000).toFixed(1)}T`;
  }
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

// ============================================
// DATA NORMALIZATION UTILITIES
// ============================================

/**
 * Detects if a dataset has extreme outliers
 * Returns true if the max value is more than 1000x the median
 */
export function hasExtremeOutliers(values: number[]): boolean {
  if (values.length === 0) return false;

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const max = sorted[sorted.length - 1];

  return max > median * 1000;
}

/**
 * Caps values at a certain percentile to handle outliers
 * @param values - Array of numeric values
 * @param percentile - Percentile to cap at (e.g., 95 means cap at 95th percentile)
 * @returns Object with capped values and the cap threshold
 */
export function capOutliers(values: number[], percentile: number = 95): {
  cappedValues: number[],
  capThreshold: number,
  hadOutliers: boolean
} {
  if (values.length === 0) return { cappedValues: [], capThreshold: 0, hadOutliers: false };

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * sorted.length);
  const capThreshold = sorted[index];

  const cappedValues = values.map(v => Math.min(v, capThreshold));
  const hadOutliers = values.some(v => v > capThreshold);

  return { cappedValues, capThreshold, hadOutliers };
}

/**
 * Normalizes data for pie charts by filtering out very small slices
 * Groups small values into "Other" category
 * @param data - Array of data objects
 * @param valueKey - Key to use for values
 * @param nameKey - Key to use for names
 * @param threshold - Minimum percentage to show individually (default 2%)
 */
export function normalizePieData(
  data: any[],
  valueKey: string,
  nameKey: string,
  threshold: number = 2
): any[] {
  if (data.length === 0) return [];

  const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);

  const significantItems: any[] = [];
  let otherTotal = 0;

  data.forEach(item => {
    const value = item[valueKey] || 0;
    const percentage = (value / total) * 100;

    if (percentage >= threshold) {
      significantItems.push(item);
    } else {
      otherTotal += value;
    }
  });

  // Add "Other" category if there are small values
  if (otherTotal > 0) {
    significantItems.push({
      [nameKey]: 'Other',
      [valueKey]: otherTotal
    });
  }

  return significantItems;
}

/**
 * Applies logarithmic scaling to values for better visualization
 * Useful for bar/line charts with extreme ranges
 */
export function applyLogScale(values: number[]): number[] {
  return values.map(v => {
    if (v <= 0) return 0;
    return Math.log10(v + 1); // +1 to handle values close to 0
  });
}

/**
 * Default chart heights for different contexts
 */
export const chartHeights = {
  small: "200px",
  medium: "300px",
  large: "400px",
  widget: "100%", // Fill parent container
};

/**
 * Chakra color tokens for charts
 */
export const chartColorTokens = {
  primary: "blue.solid",
  secondary: "purple.solid",
  tertiary: "cyan.solid",
  success: "green.solid",
  warning: "orange.solid",
  danger: "red.solid",
};


