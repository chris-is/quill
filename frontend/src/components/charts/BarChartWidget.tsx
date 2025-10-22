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

  // Initialize chart with useChart hook
  const chart = useChart({
    data: data,
    series: [{ name: yKey, color }],
  });

  return (
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
  );
};

export default BarChartWidget;
