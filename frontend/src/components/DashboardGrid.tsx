import React, { useState, useCallback } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import {
  Plus,
  X,
  BarChart3,
  Table as TableIcon,
  PieChart,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
} from "@mui/material";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import ChartContainer from "./charts/ChartContainer";
import BarChartWidget from "./charts/BarChartWidget";
import LineChartWidget from "./charts/LineChartWidget";
import PieChartWidget from "./charts/PieChartWidget";

const ResponsiveGridLayout = WidthProvider(Responsive);

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
  yColumn?: string;
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
    []
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      const updatedWidgets = widgets.filter((w) => w.id !== widgetId);
      onWidgetUpdate(updatedWidgets);
    },
    [widgets, onWidgetUpdate]
  );

  const refreshWidget = useCallback(
    async (widgetId: string) => {
      if (onRefreshWidget) {
        await onRefreshWidget(widgetId);
      }
    },
    [onRefreshWidget]
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
      y: Math.floor(index / 2) * 4,
      w: 6,
      h: 4,
      minW: 3,
      minH: 3,
    }));
  };

  const defaultLayouts = {
    lg: generateLayout(widgets),
    md: generateLayout(widgets),
    sm: generateLayout(widgets),
    xs: generateLayout(widgets),
    xxs: generateLayout(widgets),
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
        layouts={Object.keys(layouts).length > 0 ? layouts : defaultLayouts}
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
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
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
            <div className="p-4 h-full overflow-auto">
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

// Placeholder widget content component
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
      page * rowsPerPage + rowsPerPage
    );

    // Pagination event handlers
    const handleChangePage = (event: unknown, newPage: number) => {
      setPage(newPage);
    };

    const handleChangeRowsPerPage = (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const newValue = parseInt(event.target.value, 10);
      setRowsPerPage(newValue);
      setPage(0); // Go back to the first page to avoid confusion
    };

    return (
      <TableContainer
        component={Paper}
        sx={{
          height: "100%",
          boxShadow: "none",
          backgroundColor: "transparent",
        }}
      >
        <Table size="small" stickyHeader sx={{ minWidth: 300 }}>
          <TableHead>
            <TableRow>
              {Object.keys(widget.data[0] || {}).map((key) => (
                <TableCell
                  key={key}
                  sx={{
                    fontWeight: "bold",
                    color: "text.secondary",
                    padding: "8px",
                  }}
                >
                  {key}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row, index) => (
              <TableRow
                key={index}
                sx={{
                  "&:hover": { backgroundColor: "action.hover" },
                }}
              >
                {Object.values(row).map((value, cellIndex) => (
                  <TableCell
                    key={cellIndex}
                    sx={{
                      color: "text.primary",
                      padding: "8px",
                    }}
                  >
                    {String(value)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={widget.data.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    );
  }

  if (widget.type === "chart") {
    const xColumn = widget.config?.xColumn;
    const yColumn = widget.config?.yColumn;

    // Validate config
    if (!xColumn || !yColumn) {
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
            data={widget.data}
            xKey={xColumn}
            yKey={yColumn}
            showGrid={true}
            rounded={true}
          />
        );
      // TODO
      case "line":
        return (
          <LineChartWidget
            data={widget.data}
            xKey={xColumn}
            yKey={yColumn}
            showGrid={true}
          />
        );
      // TODO
      case "pie":
        return (
          <PieChartWidget
            data={widget.data}
            xKey={xColumn}
            yKey={yColumn}
            showGrid={true}
          />
        );
      // TODO
      case "area":
        return <div></div>;
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
