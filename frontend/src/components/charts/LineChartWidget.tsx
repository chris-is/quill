import React from "react";

import { Chart, useChart } from "@chakra-ui/charts";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartColorTokens,
  formatLargeNumber,
  chartAnimation,
  hasExtremeOutliers,
  capOutliers,
} from "./chartStyles";
import { Box, Text } from "@chakra-ui/react";

interface LineChartWidgetProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  showGrid?: boolean;
  minHeight?: string;
}

const LineChartWidget = ({
  data,
  xKey,
  yKey,
  color = chartColorTokens.primary,
  showGrid = true,
  minHeight = "300px",
}: LineChartWidgetProps) => {
  if (!data || data.length === 0) {
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

  // Convert string values to numbers for the yKey
  const numericData = data.map((item) => ({
    ...item,
    [yKey]:
      typeof item[yKey] === "string" ? parseFloat(item[yKey]) : item[yKey],
  }));

  // Extract numeric values for outlier detection
  const values = numericData.map((item) => item[yKey]);
  const hasOutliers = hasExtremeOutliers(values);

  // Cap outliers at 95th percentile for better visualization
  let processedData = numericData;
  let capInfo = null;

  if (hasOutliers) {
    const { cappedValues, capThreshold, hadOutliers } = capOutliers(values, 95);
    processedData = numericData.map((item, index) => ({
      ...item,
      [yKey]: cappedValues[index],
      _originalValue: values[index], // Store original for tooltip
    }));
    capInfo = { capThreshold, hadOutliers };
  }

  // Initialize chart with useChart
  const chart = useChart({
    data: processedData,
    series: [{ name: yKey, color: color }],
  });

  return (
    <Box>
      {capInfo?.hadOutliers && (
        <Text fontSize="xs" color="gray.500" mb={2} textAlign="center">
          Values capped at {formatLargeNumber(capInfo.capThreshold)} (95th
          percentile) for better visibility
        </Text>
      )}
      <Chart.Root chart={chart} height={minHeight}>
        <LineChart data={chart.data}>
          {showGrid && (
            <CartesianGrid
              stroke={chart.color("border.muted")}
              vertical={false}
              strokeDasharray="3 3"
            />
          )}

          <XAxis
            dataKey={chart.key(xKey) as string}
            axisLine={false}
            tickLine={false}
            fontSize={12}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            fontSize={12}
            tickFormatter={(value) => formatLargeNumber(value)}
          />

          {/*On hover*/}
          <Tooltip
            cursor={{ fill: chart.color("bg.muted") }}
            animationDuration={100}
            content={<Chart.Tooltip />}
          />

          {chart.series.map((item) => (
            <Line
              key={item.name as string}
              dataKey={chart.key(item.name) as string}
              stroke={chart.color(item.color)}
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={chartAnimation.duration}
              dot={false}
            />
          ))}
        </LineChart>
      </Chart.Root>
    </Box>
  );
};

export default LineChartWidget;
