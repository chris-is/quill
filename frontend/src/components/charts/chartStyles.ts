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
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
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


