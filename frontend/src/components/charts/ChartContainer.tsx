import React from "react";
import { chartLayout } from "./chartStyles";

interface ChartContainerProps {
  children: React.ReactNode; // The actual chart component
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string; // Show when no data
  minHeight?: number;
}

const ChartContainer = ({
  children,
  isLoading = false,
  error = null,
  emptyMessage = "No data available",
  minHeight = chartLayout.minHeight,
}: ChartContainerProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight }}>
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-sm text-red-600 font-medium">
            Error loading chart
          </p>
          <p className="text-xs text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // CIXX TODO: handle when no data with emptyMessage

  // Show chart
  return (
    <div
      className="w-full"
      style={{
        minHeight,
        padding: chartLayout.padding,
      }}
    >
      {children}
    </div>
  );
};

export default ChartContainer;
