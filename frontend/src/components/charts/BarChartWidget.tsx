import React from "react";
import { Chart, useChart } from "@chakra-ui/charts";
import {
  Bar,
  BarChart,
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
    capOutliers,
    hasExtremeOutliers,
} from "./chartStyles";

interface BarChartWidgetProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  showGrid?: boolean;
  rounded?: boolean;
  minHeight?: string;
}

const BarChartWidget = ({
  data,
  xKey,
  yKey,
  color = chartColorTokens.primary,
  showGrid = true,
  rounded = true,
  minHeight = "300px",
}: BarChartWidgetProps) => {
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
  const numericData = data.map(item => ({
    ...item,
    [yKey]: typeof item[yKey] === 'string' ? parseFloat(item[yKey]) : item[yKey]
  }));

  // Extract numeric values for outlier detection
  const values = numericData.map(item => item[yKey]);
  const hasOutliers = hasExtremeOutliers(values);

  // Cap outliers at 95th percentile for better visualization
  let processedData = numericData;
  let capInfo = null;

  if (hasOutliers) {
    const { cappedValues, capThreshold, hadOutliers } = capOutliers(values, 95);
    processedData = numericData.map((item, index) => ({
      ...item,
      [yKey]: cappedValues[index],
      _originalValue: values[index] // Store original for tooltip
    }));
    capInfo = { capThreshold, hadOutliers };
  }

  // Initialize chart with useChart hook
  const chart = useChart({
    data: processedData,
    series: [{ name: yKey, color }],
  });

  return (
    <Box>
      {capInfo?.hadOutliers && (
        <Text fontSize="xs" color="gray.500" mb={2} textAlign="center">
          Values capped at {formatLargeNumber(capInfo.capThreshold)} (95th percentile) for better visibility
        </Text>
      )}
      <Chart.Root chart={chart} height={minHeight}>
        <BarChart data={chart.data}>
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

        {/* On hover */}
        <Tooltip
          cursor={{ fill: chart.color("bg.muted") }}
          animationDuration={100}
          content={<Chart.Tooltip />}
        />
        {chart.series.map((item) => (
          <Bar
            key={item.name as string}
            dataKey={chart.key(item.name) as string}
            fill={chart.color(item.color)}
            radius={rounded ? 8 : 0} // Rounded top corners
            isAnimationActive={true}
            animationDuration={chartAnimation.duration}
          />
        ))}
      </BarChart>
    </Chart.Root>
    </Box>
  );
};

export default BarChartWidget;
