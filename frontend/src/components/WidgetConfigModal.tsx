import { SimpleGrid, Box, Dialog, CloseButton } from "@chakra-ui/react";
import { BarChart3, TableIcon, TrendingUp, PieChart, AreaChart, ArrowLeft } from "lucide-react";
import React, { useState } from "react";

export interface WidgetConfig {
  type: "chart" | "table";
  chartType?: "bar" | "line" | "pie" | "area";
  dataSource: string;
  query: string;
  title: string;
  config?: {
    xKey?: string;
    yKey?: string;
    seriesName?: string;
    color?: string;
  };
}

interface WidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: string[];
  onCreateWidget: (config: WidgetConfig) => void;
  queryFunction?: (sql: string) => Promise<any[]>; // For future preview functionality
}

const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({
  isOpen,
  onClose,
  tables,
  onCreateWidget,
  queryFunction,
}) => {
  type WizardStep = "SELECT_TYPE" | "SELECT_CHART_TYPE" | "CONFIGURE";
  const [currentStep, setCurrentStep] = useState<WizardStep>("SELECT_TYPE");

  const [widgetType, setWidgetType] = useState<"chart" | "table" | null>(null);
  const [chartType, setChartType] = useState<
    "bar" | "line" | "pie" | "area" | null
  >(null);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [widgetTitle, setWidgetTitle] = useState<string>("");
  const [xAxisColumn, setXAxisColumn] = useState<string>("");
  const [yAxisColumn, setYAxisColumn] = useState<string>("");

  // triggered when modal is closed
  const resetModel = () => {
    setCurrentStep("SELECT_TYPE");
    setWidgetType(null);
    setChartType(null);
    setSelectedTable("");
    setWidgetTitle("");
    setXAxisColumn("");
    setYAxisColumn("");
  };

  const handleWidgetSelection = (type: "chart" | "table") => {
    setWidgetType(type);
    if (type === "chart") {
        setCurrentStep("SELECT_CHART_TYPE");
        setWidgetTitle("New Chart");
    } else {
        setCurrentStep("CONFIGURE");
        setWidgetTitle("New Table Widget");
    }
  };

  const handleChartTypeSelection = (type: "bar" | "line" | "pie" | "area") => {
    setChartType(type);
    setCurrentStep("CONFIGURE");
    const chartName = type.charAt(0).toUpperCase() + type.slice(1);
    setWidgetTitle(`New ${chartName} Chart`);
  };

  const handleBack = () => {
    if (currentStep === "SELECT_CHART_TYPE") {
      setCurrentStep("SELECT_TYPE");
      setChartType(null);
    } else if (currentStep === "CONFIGURE") {
      if (widgetType === "chart") {
        setCurrentStep("SELECT_CHART_TYPE");
      } else {
        setCurrentStep("SELECT_TYPE");
      }
    }
  };

  const widgetTypes = [
    {
      type: "table",
      icon: TableIcon,
      label: "Table",
      description: "View raw data",
    },
    {
      type: "chart",
      icon: BarChart3,
      label: "Chart",
      description: "Visualize trends",
    },
  ];

  const chartTypes = [
    {
      type: "bar" as const,
      icon: BarChart3,
      label: "Bar Chart",
      description: "Best for comparing categories",
      example: "Sales by region, product comparison",
    },
    {
      type: "line" as const,
      icon: TrendingUp,
      label: "Line Chart",
      description: "Best for trends over time",
      example: "Revenue over months, stock prices",
    },
    {
      type: "pie" as const,
      icon: PieChart,
      label: "Pie Chart",
      description: "Best for showing proportions",
      example: "Market share, budget breakdown",
    },
    {
      type: "area" as const,
      icon: AreaChart,
      label: "Area Chart",
      description: "Best for cumulative trends",
      example: "Total users over time, stacked values",
    },
  ];

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) {
          resetModel();
          onClose();
        }
      }}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <div className="flex items-center gap-3">
              {currentStep !== "SELECT_TYPE" && (
                <button
                  onClick={handleBack}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded hover:bg-gray-100"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Dialog.Title>
                {currentStep === "SELECT_TYPE" && "Create New Widget"}
                {currentStep === "SELECT_CHART_TYPE" && "Choose Chart Type"}
                {currentStep === "CONFIGURE" && `Configure ${widgetType === "chart" ? chartType ? chartType.charAt(0).toUpperCase() + chartType.slice(1) + " Chart" : "Chart" : "Table"}`}
              </Dialog.Title>
            </div>
          </Dialog.Header>
          <Dialog.Body>
            {/* Step 1: Widget Type Selection */}
            {currentStep === "SELECT_TYPE" && (
              <>
                <div className="mb-4">
                  <p className="text-gray-600 text-sm">What would you like to add?</p>
                </div>
                <SimpleGrid columns={2} gap={4}>
                  {widgetTypes.map((widget) => {
                    const IconComponent = widget.icon;
                    return (
                      <Box
                        key={widget.type}
                        onClick={() => handleWidgetSelection(widget.type as "chart" | "table")}
                        p={6}
                        borderWidth="2px"
                        borderRadius="lg"
                        borderColor="gray.200"
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{
                          borderColor: "blue.500",
                          transform: "scale(1.02)",
                          shadow: "md",
                        }}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        textAlign="center"
                        gap={3}
                      >
                        <IconComponent className="w-12 h-12 text-blue-600" />
                        <div>
                          <div className="font-semibold text-lg text-gray-800">{widget.label}</div>
                          <div className="text-sm text-gray-500 mt-1">{widget.description}</div>
                        </div>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </>
            )}

            {/* Step 2: Chart Type Selection */}
            {currentStep === "SELECT_CHART_TYPE" && (
              <>
                <div className="mb-4">
                  <p className="text-gray-600 text-sm">Choose your chart type:</p>
                </div>
                <SimpleGrid columns={2} gap={4}>
                  {chartTypes.map((chart) => {
                    const IconComponent = chart.icon;
                    return (
                      <Box
                        key={chart.type}
                        onClick={() => handleChartTypeSelection(chart.type)}
                        p={6}
                        borderWidth="2px"
                        borderRadius="lg"
                        borderColor="gray.200"
                        cursor="pointer"
                        transition="all 0.2s"
                        _hover={{
                          borderColor: "blue.500",
                          transform: "scale(1.02)",
                          shadow: "md",
                        }}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        textAlign="center"
                        gap={3}
                      >
                        <IconComponent className="w-12 h-12 text-blue-600" />
                        <div>
                          <div className="font-semibold text-lg text-gray-800">{chart.label}</div>
                          <div className="text-sm text-gray-500 mt-1">{chart.description}</div>
                          <div className="text-xs text-gray-400 mt-2 italic">{chart.example}</div>
                        </div>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </>
            )}

            {/* Step 3: Configuration - Placeholder for now */}
            {currentStep === "CONFIGURE" && (
              <div className="py-8 text-center text-gray-500">
                <p>Configuration step coming soon...</p>
                <p className="text-sm mt-2">Widget Type: {widgetType}</p>
                {chartType && <p className="text-sm">Chart Type: {chartType}</p>}
              </div>
            )}
          </Dialog.Body>
          <Dialog.CloseTrigger asChild>
            <CloseButton size="sm" />
          </Dialog.CloseTrigger>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

export default WidgetConfigModal;
