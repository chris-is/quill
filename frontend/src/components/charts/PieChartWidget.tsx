import { Chart, useChart } from "@chakra-ui/charts";
import { Pie, PieChart, Tooltip, Cell, Legend } from "recharts";
import { Box, Text } from "@chakra-ui/react";
import { multiSeriesColors, normalizePieData } from "./chartStyles";

interface PieChartWidgetProps {
  data: any[];
  xKey: string;
  yKey: string;
  minHeight?: string;
}

const PieChartWidget = ({
  data,
  xKey,
  yKey,
  minHeight = "300px",
}: PieChartWidgetProps) => {
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

  // Convert string values to numbers for the yKey (important for pie charts!)
  const numericData = data.map((item) => ({
    ...item,
    [yKey]:
      typeof item[yKey] === "string" ? parseFloat(item[yKey]) : item[yKey],
  }));

  // Normalize pie data to group small slices into "Other"
  const normalizedData = normalizePieData(numericData, yKey, xKey, 1);

  // Initialize chart with useChart hook
  const chart = useChart({
    data: normalizedData,
  });

  // Check if data was normalized (grouped into "Other")
  const wasNormalized = normalizedData.length < numericData.length;

  // Create custom legend payload that matches our Cell colors
  const customLegendPayload = normalizedData.map((item, index) => ({
    value: item[xKey],
    type: "circle" as const,
    id: item[xKey],
    color: multiSeriesColors[index % multiSeriesColors.length],
  }));

  return (
    <Box>
      {wasNormalized && (
        <Text fontSize="xs" color="gray.500" mb={2} textAlign="center">
          Small values (&lt;1%) grouped into "Other"
        </Text>
      )}
      <Chart.Root chart={chart} height={minHeight}>
        <PieChart width={400} height={300}>
          <Legend
            payload={customLegendPayload}
            iconType="circle"
            verticalAlign="bottom"
            height={36}
          />
          <Pie
            isAnimationActive={true}
            data={chart.data}
            dataKey={chart.key(yKey) as string}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            label
          >
            {chart.data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={multiSeriesColors[index % multiSeriesColors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<Chart.Tooltip />} />
        </PieChart>
      </Chart.Root>
    </Box>
  );
};

export default PieChartWidget;