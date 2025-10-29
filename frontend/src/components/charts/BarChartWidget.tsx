import React from "react";
import { Chart, useChart } from "@chakra-ui/charts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Box, Text } from "@chakra-ui/react";
import {
  chartAnimation,
  chartColorTokens,
  formatLargeNumber,
  capOutliers,
  hasExtremeOutliers,
  multiSeriesColors,
} from "./chartStyles";

interface BarChartWidgetProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  showGrid?: boolean;
  rounded?: boolean;
  minHeight?: string;
}

const BarChartWidget = ({
  data,
  xKey,
  yKeys,
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

  // Convert string values to numbers for ALL yKeys
  let processedData = data.map((item) => {
    const newItem = { ...item };
    yKeys.forEach((yKey) => {
      newItem[yKey] =
        typeof item[yKey] === "string" ? parseFloat(item[yKey]) : item[yKey];
    });
    return newItem;
  });

  // Per-series outlier detection and capping
  const capInfoBySeries: Record<string, { capThreshold: number; hadOutliers: boolean }> = {};
  let anyOutliers = false;

  yKeys.forEach((yKey) => {
    const values = processedData.map((item) => item[yKey]);
    const hasOutliers = hasExtremeOutliers(values);

    if (hasOutliers) {
      const { cappedValues, capThreshold, hadOutliers } = capOutliers(values, 95);

      processedData = processedData.map((item, index) => ({
        ...item,
        [yKey]: cappedValues[index],
        [`_original_${yKey}`]: values[index], // Store original for tooltip
      }));

      if (hadOutliers) {
        capInfoBySeries[yKey] = { capThreshold, hadOutliers };
        anyOutliers = true;
      }
    }
  });

  // Build series array with colors cycling through multiSeriesColors
  const series = yKeys.map((yKey, index) => ({
    name: yKey,
    color: multiSeriesColors[index % multiSeriesColors.length],
  }));

  // Initialize chart with useChart hook
  const chart = useChart({
    data: processedData,
    series: series,
  });

  return (
    <Box>
      {anyOutliers && (
        <Text fontSize="xs" color="gray.500" mb={2} textAlign="center">
          Some values capped at 95th percentile for better visibility
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

          <Tooltip
            cursor={{ fill: chart.color("bg.muted") }}
            animationDuration={100}
            content={<Chart.Tooltip />}
          />

          {/* Add legend for multiple series */}
          {yKeys.length > 1 && <Legend content={<Chart.Legend />} />}

          {chart.series.map((item) => (
            <Bar
              key={item.name as string}
              dataKey={chart.key(item.name) as string}
              fill={chart.color(item.color)}
              radius={rounded ? 8 : 0}
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
