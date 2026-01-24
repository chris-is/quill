import {
  SimpleGrid,
  Box,
  Dialog,
  CloseButton,
  VStack,
  Field,
  NativeSelect,
  Spinner,
  CheckboxGroup,
  Stack,
  Checkbox,
} from "@chakra-ui/react";
import {
  BarChart3,
  TableIcon,
  TrendingUp,
  PieChart,
  AreaChart,
  ArrowLeft,
} from "lucide-react";
import { WidgetConfiguration, ColumnMetadata } from "./DashboardGrid";
import React, { useEffect, useState } from "react";
import { analyzeDataset, suggestChartConfig } from "../lib/columnInference";

export interface WidgetConfig {
  type: "chart" | "table";
  chartType?: "bar" | "line" | "pie" | "area";
  tableName: string;
  query: string;
  title: string;
  config?: WidgetConfiguration;
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
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]); // multi-series support

  const [schemaColumns, setSchemaColumns] = useState<ColumnMetadata[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [labelColumn, setLabelColumn] = useState<string>(""); // For pie charts
  const [valueColumn, setValueColumn] = useState<string>(""); // For pie charts
  const [validationErrors, setValidationErrors] = useState<string[]>([]); // Accumulate validation errors before submission

  // triggered when modal is closed
  const resetModel = () => {
    setCurrentStep("SELECT_TYPE");
    setWidgetType(null);
    setChartType(null);
    setSelectedTable("");
    setWidgetTitle("");
    setXAxisColumn("");
    setYAxisColumns([]); // Reset multi-series columns
    setSchemaColumns([]);
    setIsLoadingSchema(false);
    setSchemaError(null);
    setSelectedColumns([]);
    setLabelColumn("");
    setValueColumn("");
    setValidationErrors([]);
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

  const fetchTableSchema = async (tableName: string) => {
    if (!queryFunction) {
      setSchemaError("Query function not available");
      return;
    }

    setIsLoadingSchema(true);
    setSchemaError(null);

    try {
      // Fetch sample data to analyze column characteristics
      const sampleData = await queryFunction(
        `SELECT * FROM ${tableName} LIMIT 100`,
      );

      // Use inference utilities to analyze columns
      const analyzedColumns = analyzeDataset(sampleData);

      setSchemaColumns(analyzedColumns);

      // Auto-populate smart defaults based on chart type
      if (chartType && sampleData.length > 0) {
        const suggestion = suggestChartConfig(sampleData, chartType);

        if (suggestion.xColumn) {
          setXAxisColumn(suggestion.xColumn);
        }
        if (suggestion.yColumn) {
          setYAxisColumns([suggestion.yColumn]);
        }

        // For pie charts
        if (chartType === "pie") {
          if (suggestion.labelColumn) setLabelColumn(suggestion.labelColumn);
          if (suggestion.valueColumn) setValueColumn(suggestion.valueColumn);
        }
      }

      // For table widgets, select all columns by default
      if (widgetType === "table") {
        setSelectedColumns(analyzedColumns.map((col) => col.name));
      }
    } catch (error: any) {
      console.error("Failed to fetch table schema: ", error);
      // CIXX TODO: verify what sort of errors end up here
      setSchemaError(`Failed to load schema: ${error.message}`);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  useEffect(() => {
    if (currentStep === "CONFIGURE" && selectedTable) {
      fetchTableSchema(selectedTable);
    }
  }, [selectedTable, currentStep]);

  // validation logic
  const validateConfiguration = (): boolean => {
    const errors: string[] = [];

    if (!selectedTable) {
      errors.push("Please select a table");
    }
    if (!widgetTitle.trim()) {
      // CIXX TODO: consider making title optional
      errors.push("Please enter a widget title");
    }

    if (widgetType === "table") {
      if (selectedColumns.length === 0) {
        errors.push("Please select at least one column for the table");
      }

      const columnNames = schemaColumns.map((c) => c.name);
      const invalidColumns = selectedColumns.filter(
        (col) => !columnNames.includes(col),
      );
      if (invalidColumns.length > 0) {
        errors.push(`Invalid columns: ${invalidColumns.join(", ")}`);
      }
    }

    if (widgetType === "chart") {
      const columnNames = schemaColumns.map((c) => c.name);

      if (chartType === "pie") {
        if (!labelColumn) {
          errors.push("Please select a label column for the pie chart");
        } else if (!columnNames.includes(labelColumn)) {
          errors.push(`Label column "${labelColumn}" does not exist in table`);
        }

        if (!valueColumn) {
          errors.push("Please select a value column for the pie chart");
        } else if (!columnNames.includes(valueColumn)) {
          errors.push(`Value column "${valueColumn}" does not exist in table`);
        }
      } else {
        if (!xAxisColumn) {
          errors.push("Please select an X-axis column");
        } else if (!columnNames.includes(xAxisColumn)) {
          errors.push(`X-axis column "${xAxisColumn}" does not exist in table`);
        }

        if (yAxisColumns.length === 0) {
          errors.push("Please select at least one Y-axis column");
        } else {
          const invalidYColumns = yAxisColumns.filter(
            (col) => !columnNames.includes(col),
          );
          if (invalidYColumns.length > 0) {
            errors.push(
              `Invalid Y-axis columns: ${invalidYColumns.join(", ")}`,
            );
          }
        }
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // widget create handler
  const handleCreateWidget = () => {
    if (!validateConfiguration()) {
      return;
    }

    let query = "";
    if (widgetType === "table") {
      const columnsList = selectedColumns.join(", ");
      query = `SELECT ${columnsList} FROM ${selectedTable}`;
    } else if (widgetType === "chart") {
      if (chartType === "pie") {
        query = `SELECT ${labelColumn}, ${valueColumn} FROM ${selectedTable}`;
      } else {
        const columns = [xAxisColumn, ...yAxisColumns].join(", ");
        query = `SELECT ${columns} FROM ${selectedTable}`;
      }
    }

    const config: WidgetConfiguration = {
      columns: schemaColumns,
    };

    if (widgetType === "chart") {
      if (chartType === "pie") {
        config.labelColumn = labelColumn;
        config.valueColumn = valueColumn;
        config.xColumn = labelColumn;
        config.yColumns = [valueColumn];
      } else {
        config.xColumn = xAxisColumn;
        config.yColumns = yAxisColumns;
      }
    }

    onCreateWidget({
      type: widgetType!,
      chartType: chartType || undefined,
      tableName: selectedTable,
      query: query,
      title: widgetTitle,
      config: config,
    });

    resetModel();
    onClose();
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
            <div className="flex py-1 px-3 items-center gap-3">
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
                {currentStep === "CONFIGURE" &&
                  `Configure ${
                    widgetType === "chart"
                      ? chartType
                        ? chartType.charAt(0).toUpperCase() +
                          chartType.slice(1) +
                          " Chart"
                        : "Chart"
                      : "Table"
                  }`}
              </Dialog.Title>
            </div>
          </Dialog.Header>
          <Dialog.Body p={3}>
            {/* Step 1: Widget Type Selection */}
            {currentStep === "SELECT_TYPE" && (
              <>
                <div className="mb-4">
                  <p className="text-gray-600 text-sm">
                    What would you like to add?
                  </p>
                </div>
                <SimpleGrid columns={2} gap={4}>
                  {widgetTypes.map((widget) => {
                    const IconComponent = widget.icon;
                    return (
                      <Box
                        key={widget.type}
                        onClick={() =>
                          handleWidgetSelection(
                            widget.type as "chart" | "table",
                          )
                        }
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
                          <div className="font-semibold text-lg text-gray-800">
                            {widget.label}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {widget.description}
                          </div>
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
                  <p className="text-gray-600 text-sm">
                    Choose your chart type:
                  </p>
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
                          <div className="font-semibold text-lg text-gray-800">
                            {chart.label}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {chart.description}
                          </div>
                          <div className="text-xs text-gray-400 mt-2 italic">
                            {chart.example}
                          </div>
                        </div>
                      </Box>
                    );
                  })}
                </SimpleGrid>
              </>
            )}

            {/* Step 3: Configuration */}
            {currentStep === "CONFIGURE" && (
              <VStack gap={6} align="stretch">
                {/* Table Selection Dropdown */}
                <Field.Root>
                  <Field.Label>Select Table</Field.Label>
                  <NativeSelect.Root size="md" disabled={isLoadingSchema}>
                    <NativeSelect.Field
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                      pl={3}
                    >
                      <option value="">Choose a table...</option>
                      {tables.map((table) => (
                        <option key={table} value={table}>
                          {table}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Field.Root>

                {/* Loading State */}
                {isLoadingSchema && (
                  <Box py={8}>
                    <VStack gap={2}>
                      <Spinner size="lg" color="blue.500" />
                    </VStack>
                  </Box>
                )}

                {/* Configuration Form - Only show after schema is loaded */}
                {!isLoadingSchema &&
                  selectedTable &&
                  schemaColumns.length > 0 && (
                    <>
                      {/* Widget Title */}
                      <Field.Root>
                        <Field.Label>Widget Title</Field.Label>
                        <input
                          type="text"
                          value={widgetTitle}
                          onChange={(e) => setWidgetTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter widget title..."
                        />
                      </Field.Root>

                      {/* Chart Configuration: Bar, Line, Area */}
                      {widgetType === "chart" &&
                        chartType &&
                        chartType !== "pie" && (
                          <>
                            {/* X-Axis Column */}
                            <Field.Root>
                              <Field.Label>X-Axis Column</Field.Label>
                              <Box
                                borderWidth="1px"
                                borderRadius="md"
                                p={3}
                                maxH="200px"
                                overflowY="auto"
                              >
                                <Stack gap={2}>
                                  {schemaColumns.map((col) => (
                                    <label
                                      key={col.name}
                                      className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50"
                                    >
                                      <input
                                        type="radio"
                                        name="xAxisColumn"
                                        value={col.name}
                                        checked={xAxisColumn === col.name}
                                        onChange={(e) =>
                                          setXAxisColumn(e.target.value)
                                        }
                                        className="w-4 h-4"
                                      />
                                      <span className="text-sm">
                                        {col.name}{" "}
                                        <span className="text-gray-500">
                                          ({col.type})
                                        </span>
                                      </span>
                                    </label>
                                  ))}
                                </Stack>
                              </Box>
                              <Field.HelperText>
                                Choose the column for the horizontal axis
                              </Field.HelperText>
                            </Field.Root>

                            {/* Y-Axis Columns - Multi-select */}
                            <Field.Root>
                              <Field.Label>Y-Axis Columns</Field.Label>
                              <Box
                                borderWidth="1px"
                                borderRadius="md"
                                p={3}
                                maxH="200px"
                                overflowY="auto"
                              >
                                <CheckboxGroup
                                  value={yAxisColumns}
                                  onValueChange={setYAxisColumns}
                                >
                                  <Stack gap={2}>
                                    {schemaColumns
                                      .filter((col) => col.type === "numeric")
                                      .map((col) => (
                                        <Checkbox.Root
                                          key={col.name}
                                          value={col.name}
                                        >
                                          <Checkbox.HiddenInput />
                                          <Checkbox.Control />
                                          <Checkbox.Label>
                                            <span className="text-sm">
                                              {col.name}{" "}
                                              <span className="text-gray-500">
                                                ({col.type})
                                              </span>
                                            </span>
                                          </Checkbox.Label>
                                        </Checkbox.Root>
                                      ))}
                                  </Stack>
                                </CheckboxGroup>
                              </Box>
                              <Field.HelperText>
                                Select one or more numeric columns to plot
                              </Field.HelperText>
                            </Field.Root>
                          </>
                        )}

                      {/* Pie Chart Configuration */}
                      {widgetType === "chart" && chartType === "pie" && (
                        <>
                          {/* Label Column */}
                          <Field.Root>
                            <Field.Label>Label Column</Field.Label>
                            <NativeSelect.Root size="md">
                              <NativeSelect.Field
                                value={labelColumn}
                                onChange={(e) => setLabelColumn(e.target.value)}
                                pl={3}
                              >
                                <option value="">Select column...</option>
                                {schemaColumns.map((col) => (
                                  <option key={col.name} value={col.name}>
                                    {col.name} ({col.type})
                                  </option>
                                ))}
                              </NativeSelect.Field>
                            </NativeSelect.Root>
                            <Field.HelperText>
                              Choose the column for pie slice labels
                            </Field.HelperText>
                          </Field.Root>

                          {/* Value Column */}
                          <Field.Root>
                            <Field.Label>Value Column</Field.Label>
                            <NativeSelect.Root size="md">
                              <NativeSelect.Field
                                value={valueColumn}
                                onChange={(e) => setValueColumn(e.target.value)}
                                pl={3}
                              >
                                <option value="">Select column...</option>
                                {schemaColumns
                                  .filter((col) => col.type === "numeric")
                                  .map((col) => (
                                    <option key={col.name} value={col.name}>
                                      {col.name} ({col.type})
                                    </option>
                                  ))}
                              </NativeSelect.Field>
                            </NativeSelect.Root>
                            <Field.HelperText>
                              Choose the numeric column for pie slice sizes
                            </Field.HelperText>
                          </Field.Root>
                        </>
                      )}

                      {/* Table Widget Configuration */}
                      {widgetType === "table" && (
                        <Field.Root>
                          <Field.Label>Select Columns to Display</Field.Label>
                          <Box
                            borderWidth="1px"
                            borderRadius="md"
                            p={3}
                            maxH="200px"
                            overflowY="auto"
                          >
                            {schemaColumns.map((col) => (
                              <label
                                key={col.name}
                                className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedColumns.includes(col.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedColumns([
                                        ...selectedColumns,
                                        col.name,
                                      ]);
                                    } else {
                                      setSelectedColumns(
                                        selectedColumns.filter(
                                          (c) => c !== col.name,
                                        ),
                                      );
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">
                                  {col.name}{" "}
                                  <span className="text-gray-500">
                                    ({col.type})
                                  </span>
                                </span>
                              </label>
                            ))}
                          </Box>
                          <Field.HelperText>
                            Select which columns to show in the table
                          </Field.HelperText>
                        </Field.Root>
                      )}

                      {/* Validation Errors */}
                      {validationErrors.length > 0 && (
                        <Box
                          p={3}
                          bg="red.50"
                          borderWidth="1px"
                          borderColor="red.200"
                          borderRadius="md"
                        >
                          <div className="text-sm text-red-700">
                            <div className="font-semibold mb-2">
                              Please fix the following errors:
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                              {validationErrors.map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </Box>
                      )}

                      {/* Create Button */}
                      <button
                        onClick={handleCreateWidget}
                        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Create Widget
                      </button>
                    </>
                  )}

                {/* Error State */}
                {schemaError && (
                  <Box
                    p={3}
                    bg="red.50"
                    borderWidth="1px"
                    borderColor="red.200"
                    borderRadius="md"
                  >
                    <div className="text-sm text-red-700">{schemaError}</div>
                  </Box>
                )}
              </VStack>
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
