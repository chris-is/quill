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

import {
  chartColors,
  chartTypography,
  chartLayout,
  chartAnimation,
} from "./chartStyles";

interface BarChartWidgetProps {
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
  seriesName: string;
  showValues?: boolean;
}

const BarChartWidget = () => {
  return <div>BarChartWidget</div>;
};

export default BarChartWidget;
