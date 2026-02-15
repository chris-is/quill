import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Play,
  Download,
  Copy,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Drawer,
  Button,
  Portal,
  CloseButton,
  Dialog,
  Field,
  VStack,
  Box,
  Table,
  HStack,
  Text,
  Input,
} from "@chakra-ui/react";
import { toaster } from "./ui/toaster";
import { SqlMonacoEditor } from "@sqlrooms/sql-editor";

import { useDuckDB } from "../lib/DuckDBContext";

interface QueryResult {
  data: any[];
  columns: string[];
  rowCount: number;
  executionTime: number;
  query: string;
  timestamp: Date;
}

interface QueryHistory {
  id: string;
  query: string;
  timestamp: Date;
  success: boolean;
  rowCount?: number;
  executionTime?: number;
  error?: string;
  saveAsTable?: string;
}

// Paginated table component using Chakra UI (memoized to prevent re-renders when parent state changes)
const PaginatedResultsTable = React.memo<{ results: QueryResult }>(
  ({ results }) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Reset pagination when new results come in
    useEffect(() => {
      setPage(0);
      setRowsPerPage(10);
    }, [results]);

    if (results.data.length === 0) {
      return (
        <Box flex="1" px={1} py={1} pb={4}>
          <div className="flex items-center justify-center h-32 text-gray-500">
            No results returned
          </div>
        </Box>
      );
    }

    // Calculate paginated data (memoized to avoid recalculation on unrelated re-renders)
    const paginatedData = useMemo(
      () =>
        results.data.slice(
          page * rowsPerPage,
          page * rowsPerPage + rowsPerPage,
        ),
      [results.data, page, rowsPerPage],
    );

    const totalPages = useMemo(
      () => Math.ceil(results.data.length / rowsPerPage),
      [results.data.length, rowsPerPage],
    );

    // Format cell value (memoized callback for stable reference)
    const formatValue = useCallback((value: any): string => {
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    }, []);

    return (
      <Box flex="1" px={1} py={1} pb={4} display="flex" flexDirection="column">
        <Table.ScrollArea
          borderWidth="1px"
          rounded="md"
          flex="1"
          minHeight="0"
          maxHeight="calc(100vh - 550px)"
        >
          <Table.Root size="sm" stickyHeader>
            <Table.Header>
              <Table.Row bg="bg.subtle">
                {results.columns.map((col) => (
                  <Table.ColumnHeader
                    key={col}
                    whiteSpace="nowrap"
                    textAlign="left"
                    px={4}
                  >
                    {col}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {paginatedData.map((row, rowIndex) => (
                <Table.Row key={rowIndex}>
                  {results.columns.map((col) => (
                    <Table.Cell
                      key={col}
                      whiteSpace="nowrap"
                      textAlign="left"
                      px={4}
                    >
                      {formatValue(row[col])}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>

        {/* Pagination Controls */}
        <HStack justify="space-between" py={2} px={2} mt={2}>
          <HStack gap={2}>
            <Text fontSize="sm">Rows per page:</Text>
            <Input
              type="number"
              size="sm"
              width="70px"
              min={1}
              paddingLeft={3}
              max={1000}
              value={rowsPerPage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = parseInt(e.target.value, 10);
                if (value > 0 && value <= 1000) {
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

          <Text fontSize="sm" color="gray.500">
            {results.data.length.toLocaleString()} total rows
          </Text>
        </HStack>
      </Box>
    );
  },
);

export const SQLQueryInterface: React.FC = () => {
  const [currentQuery, setCurrentQuery] = useState("SELECT * FROM ");
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { query, tables, isInitialized, refreshTables } = useDuckDB();

  // Sample queries based on available tables
  const getSampleQueries = () => {
    if (tables.length === 0) return [];
    const firstTable = tables[0];
    return [
      `SELECT * FROM ${firstTable} LIMIT 10`,
      `SELECT COUNT(*) as total_rows FROM ${firstTable}`,
      `DESCRIBE ${firstTable}`,
      tables.length > 1 ? `SHOW TABLES` : null,
    ].filter(Boolean);
  };

  const executeQuery = async (queryText?: string) => {
    const queryToExecute = queryText ?? currentQuery;
    if (!queryToExecute.trim() || !isInitialized) return;

    setIsExecuting(true);
    setError(null);

    const startTime = Date.now();

    try {
      const queryData = await query(queryToExecute.trim());
      const executionTime = Date.now() - startTime;

      // Extract column names from first row
      const columns = queryData.length > 0 ? Object.keys(queryData[0]) : [];

      const result: QueryResult = {
        data: queryData,
        columns,
        rowCount: queryData.length,
        executionTime,
        query: queryToExecute.trim(),
        timestamp: new Date(),
      };

      setResults(result);

      // Add to history
      const historyEntry: QueryHistory = {
        id: `query-${Date.now()}`,
        query: queryToExecute.trim(),
        timestamp: new Date(),
        success: true,
        rowCount: queryData.length,
        executionTime,
      };

      setQueryHistory((prev) => [historyEntry, ...prev.slice(0, 19)]); // Keep last 20 queries
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Query execution failed";
      setError(errorMessage);

      // Add failed query to history
      const historyEntry: QueryHistory = {
        id: `query-${Date.now()}`,
        query: queryToExecute.trim(),
        timestamp: new Date(),
        success: false,
        error: errorMessage,
      };

      setQueryHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);
    } finally {
      setIsExecuting(false);
    }
  };

  // Ref to hold the latest executeQuery function (avoids stale closure in Monaco onMount)
  const executeQueryRef = useRef(executeQuery);
  executeQueryRef.current = executeQuery;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadCSV = () => {
    if (!results || !results.data.length) return;

    const csvContent = [
      results.columns.join(","),
      ...results.data.map((row) =>
        results.columns.map((col) => JSON.stringify(row[col] || "")).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateTableName = (name: string): string | null => {
    if (!name.trim()) {
      return "Table name is required";
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return "Table name must start with a letter or underscore, and contain only letters, numbers, and underscores";
    }
    if (tables.includes(name)) {
      return "Table name already exists";
    }
    if (name.length > 64) {
      return "Table name must be 64 characters or less";
    }
    return null;
  };

  const openSaveModal = () => {
    if (!results || !results.data.length) return;
    // Generate default table name from timestamp
    setNewTableName(`query_result_${Date.now()}`);
    setSaveError(null);
    setShowSaveModal(true);
  };

  const saveAsTable = async () => {
    if (!results) return;
    var editedTableName = newTableName;
    const validationError = validateTableName(editedTableName);

    if (validationError == "Table name already exists") {
      editedTableName = editedTableName + "_copy";
    }
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Use CREATE TABLE AS to save the query results
      await query(`CREATE TABLE ${editedTableName} AS ${results.query}`);
      await refreshTables();

      setShowSaveModal(false);
      setNewTableName("");

      // Update history entry to show it was saved as a table
      setQueryHistory((prev) =>
        prev.map((entry) =>
          entry.query === results.query
            ? { ...entry, saveAsTable: editedTableName }
            : entry,
        ),
      );

      // Show success toast
      toaster.create({
        title: "Table saved successfully!",
        description: `"${editedTableName}" is now available in your tables. Go to Dashboard to visualize it.`,
        type: "success",
        duration: 5000,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save table");
    } finally {
      setIsSaving(false);
    }
  };

  const loadQueryFromHistory = (historyQuery: QueryHistory) => {
    setCurrentQuery(historyQuery.query);
    setShowHistory(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              SQL Query Interface
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            {tables.length > 0 && (
              <div className="px-3 text-sm text-gray-600">
                Tables: {tables.join(", ")}
              </div>
            )}
            {/* Query History Sidebar Chakra-UI */}
            <Drawer.Root
              placement="end"
              open={showHistory}
              onOpenChange={(details) => setShowHistory(details.open)}
            >
              <Drawer.Trigger asChild>
                <Button variant="outline" size="sm" px={3} py={2}>
                  <Clock className="w-4 h-4 inline mr-1" />
                  History
                </Button>
              </Drawer.Trigger>
              <Portal>
                <Drawer.Backdrop />
                <Drawer.Positioner>
                  <Drawer.Content>
                    <Drawer.Header>
                      <Drawer.Title px={3} py={2}>
                        Query History
                      </Drawer.Title>
                    </Drawer.Header>
                    <Drawer.Body>
                      <div className="p-2">
                        {queryHistory.length > 0 ? (
                          queryHistory.map((historyItem) => (
                            <div
                              key={historyItem.id}
                              className="p-3 mb-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => loadQueryFromHistory(historyItem)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-500 mb-1">
                                    {historyItem.timestamp.toLocaleTimeString()}
                                  </div>
                                  <div className="text-sm font-mono text-gray-800 truncate">
                                    {historyItem.query}
                                  </div>
                                  <div className="flex items-center space-x-2 mt-2">
                                    {historyItem.success ? (
                                      <>
                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                        <span className="text-xs text-gray-600">
                                          {historyItem.rowCount} rows in{" "}
                                          {historyItem.executionTime}ms
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                        <span className="text-xs text-red-600">
                                          Error
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {historyItem.saveAsTable && (
                                    <div className="flex items-center space-x-1 mt-2">
                                      <Database className="w-3 h-3 text-blue-500" />
                                      <span className="text-xs text-blue-600">
                                        Saved as "{historyItem.saveAsTable}"
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 mt-8">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm px-3">
                              No queries executed yet
                            </p>
                          </div>
                        )}
                      </div>
                    </Drawer.Body>
                    <Drawer.Footer gap="3" px="2" py="2">
                      <Drawer.ActionTrigger asChild>
                        <Button
                          variant="outline"
                          size="md"
                          width="1/3"
                          onClick={() => setQueryHistory([])}
                        >
                          Clear
                        </Button>
                      </Drawer.ActionTrigger>
                    </Drawer.Footer>
                    <Drawer.CloseTrigger asChild>
                      <CloseButton size="sm" />
                    </Drawer.CloseTrigger>
                  </Drawer.Content>
                </Drawer.Positioner>
              </Portal>
            </Drawer.Root>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Query Editor */}
        <div className="flex-1 flex flex-col">
          {/* Sample Queries */}
          {getSampleQueries().length > 0 && (
            <div className="bg-white border-b border-gray-200 p-3">
              <div className="text-xs text-gray-500 mb-2">Sample queries:</div>
              <div className="flex flex-wrap gap-2">
                {getSampleQueries().map((sampleQuery, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuery(sampleQuery!)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded transition-colors"
                  >
                    {sampleQuery}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Query Editor with Monaco */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                SQL Query
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(currentQuery)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                  title="Copy query"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500">
                  Ctrl+Enter to execute
                </span>
              </div>
            </div>

            <div className="relative border border-gray-300 rounded-md overflow-hidden">
              <SqlMonacoEditor
                value={currentQuery}
                onChange={(value) => setCurrentQuery(value ?? "")}
                height="300px"
                onMount={(editor, monaco) => {
                  // Register Ctrl+Enter keyboard shortcut to execute query
                  editor.addAction({
                    id: "execute-query",
                    label: "Execute Query",
                    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                    run: (ed) => {
                      const selection = ed.getSelection();
                      let queryToExecute: string;

                      // If text is selected, execute only the selection
                      if (selection && !selection.isEmpty()) {
                        queryToExecute =
                          ed.getModel()?.getValueInRange(selection) ?? "";
                      } else {
                        // No selection - execute entire editor content
                        queryToExecute = ed.getValue();
                      }

                      // Use ref to avoid stale closure (onMount only fires once)
                      executeQueryRef.current(queryToExecute);
                    },
                  });
                }}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-gray-500">
                {!isInitialized
                  ? "DuckDB not initialized"
                  : "Ready to execute queries"}
              </div>

              <button
                onClick={() => executeQuery()}
                disabled={!currentQuery.trim() || isExecuting || !isInitialized}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Play
                  className={`w-4 h-4 ${isExecuting ? "animate-spin" : ""}`}
                />
                <span>{isExecuting ? "Executing..." : "Execute"}</span>
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 bg-white">
            {error && (
              <div className="p-4 bg-red-50 border-b border-red-200">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-800">
                      Query Error
                    </h4>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {results && (
              <div className="h-full flex flex-col">
                {/* Results Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {results.rowCount} rows
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Executed in {results.executionTime}ms
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={downloadCSV}
                      className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={openSaveModal}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-sm text-blue-700 rounded transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save as Table</span>
                    </button>
                  </div>
                </div>

                {/* Results Table */}
                <PaginatedResultsTable results={results} />
              </div>
            )}

            {!results && !error && !isExecuting && (
              <div className="py-3 flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">
                    Ready to query your data
                  </p>
                  <p className="py-3 text-sm">
                    Write a SQL query and press Execute or Ctrl+Enter
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save as Table Modal */}
      <Dialog.Root
        open={showSaveModal}
        onOpenChange={(e) => {
          if (!e.open) {
            setShowSaveModal(false);
            setSaveError(null);
          }
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title p={2}>Save Query Results as Table</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  {results && (
                    <Box p={3} bg="gray.50" borderRadius="md" borderWidth="1px">
                      <div className="text-sm text-gray-600">
                        <div className="font-medium mb-1">Query Summary</div>
                        <div>Rows: {results.rowCount}</div>
                        <div>Columns: {results.columns.join(", ")}</div>
                      </div>
                    </Box>
                  )}

                  <Field.Root invalid={!!saveError}>
                    <Field.Label px={2}>Table Name</Field.Label>
                    <Box px={2}>
                      <input
                        type="text"
                        value={newTableName}
                        onChange={(e) => {
                          setNewTableName(e.target.value);
                          setSaveError(null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="my_table_name"
                      />
                    </Box>
                    <Field.HelperText px={2}>
                      Use letters, numbers, and underscores only
                    </Field.HelperText>
                    {saveError && (
                      <Field.ErrorText>{saveError}</Field.ErrorText>
                    )}
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  p={3}
                  m={1}
                  variant="outline"
                  onClick={() => setShowSaveModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="blue"
                  p={3}
                  mr={2}
                  onClick={saveAsTable}
                  disabled={isSaving || !newTableName.trim()}
                >
                  {isSaving ? "Saving..." : "Save Table"}
                </Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </div>
  );
};
