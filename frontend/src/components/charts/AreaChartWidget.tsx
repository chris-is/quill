import React from "react";

import { Chart, useChart } from "@chakra-ui/charts";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import {
  chartColorTokens,
  formatLargeNumber,
  chartAnimation,
  hasExtremeOutliers,
  capOutliers,
} from "./chartStyles";

import { Box, Text } from "@chakra-ui/react";

interface AreaChartWidgetProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  showGrid?: boolean;
  minHeight?: string;
}

const AreaChartWidget = ({
  data,
  xKey,
  yKey,
  color = chartColorTokens.primary,
  showGrid = true,
  minHeight = "300px",
}: AreaChartWidgetProps) => {
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
        <Text fontSize="sm" color="gray.500" mb={2} textAlign="center">
          Values capped at {formatLargeNumber(capInfo.capThreshold)} (95th
          percentile) for better visibility
        </Text>
      )}
      <Chart.Root chart={chart} height={minHeight}>
        <AreaChart data={chart.data}>
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
          <Legend content={<Chart.Legend />} />
          {chart.series.map((item) => (
            <Area
              key={item.name as string}
              dataKey={chart.key(item.name) as string}
              stroke={chart.color(item.color)}
              stackId="a"
              fill={chart.color(item.color)}
              fillOpacity={0.2}
              isAnimationActive={true}
              animationDuration={chartAnimation.duration}
              dot={false}
            />
          ))}
        </AreaChart>
      </Chart.Root>
    </Box>
  );
};

export default AreaChartWidget;
