import React, { useState, useCallback } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { Plus, X, BarChart3, Table as TableIcon, PieChart, RefreshCw } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface Widget {
  id: string;
  type: 'chart' | 'table' | 'metric';
  title: string;
  query: string;
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  data?: any[];
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

  const handleLayoutChange = useCallback((layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    onWidgetUpdate(updatedWidgets);
  }, [widgets, onWidgetUpdate]);

  const refreshWidget = useCallback(async (widgetId: string) => {
    if (onRefreshWidget) {
      await onRefreshWidget(widgetId);
    }
  }, [onRefreshWidget]);

  const getWidgetIcon = (type: string, chartType?: string) => {
    if (type === 'table') return <TableIcon className="w-4 h-4" />;
    if (type === 'chart') {
      switch (chartType) {
        case 'pie': return <PieChart className="w-4 h-4" />;
        default: return <BarChart3 className="w-4 h-4" />;
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
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                {getWidgetIcon(widget.type, widget.chartType)}
                <h3 className="text-sm font-medium text-gray-700 truncate">
                  {widget.title}
                </h3>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => refreshWidget(widget.id)}
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeWidget(widget.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
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

  if (widget.type === 'table') {
    return (
      <div className="overflow-auto h-full">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              {Object.keys(widget.data[0] || {}).map((key) => (
                <th key={key} className="text-left p-1 font-medium text-gray-600">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.data.slice(0, 10).map((row, index) => (
              <tr key={index} className="border-b border-gray-100">
                {Object.values(row).map((value, cellIndex) => (
                  <td key={cellIndex} className="p-1 text-gray-700">
                    {String(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <BarChart3 className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">Chart visualization</p>
        <p className="text-xs text-gray-300 mt-1">Coming soon</p>
      </div>
    </div>
  );
};