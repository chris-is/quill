import React from "react";

import { Chart, useChart } from "@chakra-ui/charts";
import {
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { Box, Text } from "@chakra-ui/react";
import {
  chartColors,
  chartTypography,
  chartLayout,
  chartAnimation,
  chartColorTokens,
  formatLargeNumber,
  multiSeriesColors,
  normalizePieData,
  hasExtremeOutliers,
} from "./chartStyles";

interface PieChartWidgetProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  showGrid?: boolean;
  minHeight?: string;
}

const PieChartWidget = ({
  data,
  xKey,
  yKey,
  color = chartColorTokens.primary,
  showGrid = true,
  minHeight = "300px",
}: PieChartWidgetProps) => {
  // Debug logging - check what data we're receiving
  console.log("PieChartWidget - data:", data);
  console.log("PieChartWidget - xKey:", xKey);
  console.log("PieChartWidget - yKey:", yKey);

  if (!data || data.length === 0) {
    console.log("PieChartWidget - NO DATA");
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight={minHeight}
      >
        <Text fontSize="sm" color="gray.400">
          No data to display
        </Text>
      </Box>
    );
  }

  // Convert string values to numbers for the yKey (important for pie charts!)
  const numericData = data.map((item) => ({
    ...item,
    [yKey]:
      typeof item[yKey] === "string" ? parseFloat(item[yKey]) : item[yKey],
  }));

  // Normalize pie data to group small slices into "Other"
  // This prevents tiny slices from being invisible when there are huge outliers
  const normalizedData = normalizePieData(numericData, yKey, xKey, 1); // 1% threshold

  console.log("PieChartWidget - original data count:", numericData.length);
  console.log("PieChartWidget - normalized data count:", normalizedData.length);

  // Initialize chart with useChart hook
  const chart = useChart({
    data: normalizedData,
  });

  // Check if data was normalized (grouped into "Other")
  const wasNormalized = normalizedData.length < numericData.length;

  return (
    <Box>
      {wasNormalized && (
        <Text fontSize="xs" color="gray.500" mb={2} textAlign="center">
          Small values less than 1% grouped into "Other" for better visibility
        </Text>
      )}
      <Chart.Root chart={chart} height={minHeight}>
        <PieChart width={400} height={300}>
          <Pie
            isAnimationActive={true}
            data={chart.data}
            dataKey={chart.key(yKey) as string}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={60}
            label
          >
            {chart.data.map((item, index) => (
              <Cell
                key={`cell-${index}`}
                fill={multiSeriesColors[index % multiSeriesColors.length]}
              />
            ))}
          </Pie>

          {/* Tooltip */}
          <Tooltip content={<Chart.Tooltip />} />
        </PieChart>
      </Chart.Root>
    </Box>
  );
};

export default PieChartWidget;
