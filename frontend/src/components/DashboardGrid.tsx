import React, { useState, useCallback } from "react";
import {
  Responsive,
  WidthProvider,
  Layout,
  ResponsiveProps,
} from "react-grid-layout";
import {
  Plus,
  X,
  BarChart3,
  Table as TableIcon,
  PieChart,
  RefreshCw,
} from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import ChartContainer from "./charts/ChartContainer";
import BarChartWidget from "./charts/BarChartWidget";
import LineChartWidget from "./charts/LineChartWidget";
import PieChartWidget from "./charts/PieChartWidget";
import AreaChartWidget from "./charts/AreaChartWidget";
import { Table, Button, Input, HStack, Text } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
const ResponsiveGridLayout = WidthProvider(
  Responsive,
) as React.ComponentType<ResponsiveProps>;

export interface Widget {
  id: string;
  type: "chart" | "table" | "metric";
  title: string;
  tableName: string;
  query: string;
  chartType?: "bar" | "line" | "pie" | "area";
  data?: any[];
  config?: WidgetConfiguration;
}

export interface WidgetConfiguration {
  // Column selections for different chart types
  xColumn?: string;
  yColumns?: string[];
  labelColumn?: string; // for pie charts
  valueColumn?: string; // for pie charts

  // column metadata
  columns?: ColumnMetadata[];

  // optional aggregation
  aggregation?: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX" | null;

  // legacy fields (CIXX TODO: maybe remove?)
  xKey?: string;
  yKey?: string;
  seriesName?: string;
  color?: string;
}

// Describe column properties
export interface ColumnMetadata {
  name: string;
  type: "temporal" | "numeric" | "categorical" | "boolean" | "unknown";
  sampleValues?: any[]; // used for preview
}

interface DashboardGridProps {
  widgets: Widget[];
  onWidgetUpdate: (widgets: Widget[]) => void;
  onAddWidget: () => void;
  onRefreshWidget?: (widgetId: string) => Promise<void>;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  widgets,
  onWidgetUpdate,
  onAddWidget,
  onRefreshWidget,
}) => {
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});

  const handleLayoutChange = useCallback(
    (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
      setLayouts(allLayouts);
    },
    [],
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      const updatedWidgets = widgets.filter((w) => w.id !== widgetId);
      onWidgetUpdate(updatedWidgets);
    },
    [widgets, onWidgetUpdate],
  );

  const refreshWidget = useCallback(
    async (widgetId: string) => {
      if (onRefreshWidget) {
        await onRefreshWidget(widgetId);
      }
    },
    [onRefreshWidget],
  );

  const getWidgetIcon = (type: string, chartType?: string) => {
    if (type === "table") return <TableIcon className="w-4 h-4" />;
    if (type === "chart") {
      switch (chartType) {
        case "pie":
          return <PieChart className="w-4 h-4" />;
        default:
          return <BarChart3 className="w-4 h-4" />;
      }
    }
    return <BarChart3 className="w-4 h-4" />;
  };

  const generateLayout = (widgets: Widget[]): Layout[] => {
    return widgets.map((widget, index) => ({
      i: widget.id,
      x: (index * 6) % 12,
      y: Math.floor(index / 2) * 6,
      w: 6,
      h: 6,
      minW: 3,
      minH: 4,
    }));
  };

  const defaultLayouts = {
    lg: generateLayout(widgets),
    md: generateLayout(widgets),
    sm: generateLayout(widgets),
    xs: generateLayout(widgets),
    xxs: generateLayout(widgets),
  };

  // Merge saved layouts with defaults - ensures new widgets get proper sizing
  // while preserving user's custom positions for existing widgets
  const getMergedLayouts = () => {
    if (Object.keys(layouts).length === 0) return defaultLayouts;

    const merged: { [key: string]: Layout[] } = {};
    const breakpoints = ["lg", "md", "sm", "xs", "xxs"] as const;

    for (const bp of breakpoints) {
      const savedLayout = layouts[bp] || [];
      const defaultLayout = defaultLayouts[bp];

      // Create a map of saved layouts by widget id
      const savedMap = new Map(savedLayout.map((l) => [l.i, l]));

      // For each widget, use saved layout if exists, otherwise use default
      merged[bp] = defaultLayout.map((defaultItem) => {
        const saved = savedMap.get(defaultItem.i);
        if (saved) {
          // Keep saved position but ensure minimum height
          return { ...saved, minH: 4 };
        }
        return defaultItem;
      });
    }
    return merged;
  };

  return (
    <div className="w-full h-full bg-gray-50 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button
          onClick={onAddWidget}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Widget</span>
        </button>
      </div>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={getMergedLayouts()}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
        margin={[16, 16]}
        containerPadding={[0, 0]}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col"
          >
            {/* Widget Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 react-grid-no-drag">
              <div className="flex items-center space-x-2">
                {getWidgetIcon(widget.type, widget.chartType)}
                <h3 className="text-sm font-medium text-gray-700 truncate">
                  {widget.title}
                </h3>
              </div>
              <div className="flex items-center space-x-1 react-grid-no-drag">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    refreshWidget(widget.id);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className="text-gray-400 hover:text-blue-500 transition-colors p-1"
                  title="Refresh data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    removeWidget(widget.id);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Remove widget"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Widget Content */}
            <div className="p-4 flex-1 overflow-auto">
              <WidgetContent widget={widget} />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <BarChart3 className="w-16 h-16 mb-4" />
          <h3 className="text-lg font-medium mb-2">No widgets yet</h3>
          <p className="text-sm text-center mb-4">
            Add your first widget to start building your dashboard
          </p>
          <button
            onClick={onAddWidget}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Widget</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Widget content component
const WidgetContent: React.FC<{ widget: Widget }> = ({ widget }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Empty data handling
  if (!widget.data || widget.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No data available</p>
          <p className="text-xs text-gray-300 mt-1">Run query to populate</p>
        </div>
      </div>
    );
  }

  if (widget.type === "table") {
    // Calculate paginated data
    const paginatedData = widget.data.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );

    // Calculate total pages for pagination display
    const totalPages = Math.ceil(widget.data.length / rowsPerPage);

    return (
      <div className="flex flex-col h-full">
        <Table.ScrollArea borderWidth="1px" rounded="md" className="flex-1 min-h-0">
          <Table.Root size="sm" stickyHeader>
            <Table.Header>
              <Table.Row bg="bg.subtle">
                {Object.keys(widget.data[0] || {}).map((key) => (
                  <Table.ColumnHeader
                    key={key}
                    whiteSpace="nowrap"
                    textAlign="left"
                    px={4}
                  >
                    {key}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {paginatedData.map((row, index) => (
                <Table.Row key={index}>
                  {Object.values(row).map((value, cellIndex) => (
                    <Table.Cell
                      key={cellIndex}
                      whiteSpace="nowrap"
                      textAlign="left"
                      px={4}
                    >
                      {String(value)}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>

        {/* Pagination Controls */}
        <HStack
          justify="space-between"
          py={2}
          px={2}
          mt={2}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <HStack gap={2}>
            <Text fontSize="sm">Rows:</Text>
            <Input
              type="number"
              size="sm"
              width="70px"
              min={1}
              value={rowsPerPage}
              paddingLeft={3}
              css={{
                "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
                MozAppearance: "textfield",
              }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = parseInt(e.target.value, 10);
                if (value > 0) {
                  setRowsPerPage(value);
                  setPage(0);
                }
              }}
            />
          </HStack>

          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
            </Button>

            <Text fontSize="sm">
              {page + 1} / {totalPages}
            </Text>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={16} />
            </Button>
          </HStack>
        </HStack>
      </div>
    );
  }

  if (widget.type === "chart") {
    const xColumn = widget.config?.xColumn;
    const yColumns = widget.config?.yColumns;

    // Validate config
    if (!xColumn || !yColumns || yColumns.length === 0) {
      return (
        <ChartContainer error="Missing chart configuration">
          <div />
        </ChartContainer>
      );
    }

    // Render based on chart type
    switch (widget.chartType) {
      case "bar":
        return (
          <BarChartWidget
            data={widget.data!}
            xKey={xColumn}
            yKeys={yColumns}
            showGrid={true}
            rounded={true}
          />
        );
      case "line":
        return (
          <LineChartWidget
            data={widget.data!}
            xKey={xColumn}
            yKeys={yColumns}
            showGrid={true}
          />
        );
      case "pie":
        return (
          <PieChartWidget
            data={widget.data!}
            xKey={xColumn}
            yKey={yColumns[0]}
          />
        );
      case "area":
        return (
          <AreaChartWidget
            data={widget.data!}
            xKey={xColumn}
            yKeys={yColumns}
            showGrid={true}
          />
        );
      default:
        return (
          <ChartContainer error={`Unknown chart type: ${widget.chartType}`}>
            <div />
          </ChartContainer>
        );
    }
  }

  // Fallback
  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <p className="text-sm">Unknown widget type</p>
    </div>
  );
};
