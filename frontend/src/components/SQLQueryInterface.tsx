import React, { useState } from "react";
import {
  Play,
  Download,
  Copy,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Drawer, Button, Portal, CloseButton } from "@chakra-ui/react";
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
}

export const SQLQueryInterface: React.FC = () => {
  const [currentQuery, setCurrentQuery] = useState("SELECT * FROM ");
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const { query, tables, isInitialized } = useDuckDB();

  // Sample queries based on available tables
  const getSampleQueries = () => {
    if (tables.length === 0) return [];
    const firstTable = tables[0];
    return [
      `SELECT * FROM ${firstTable} LIMIT 10`,
      `SELECT COUNT(*) as total_rows FROM ${firstTable}`,
      `DESCRIBE ${firstTable}`,
      `SELECT * FROM ${firstTable} WHERE ROWNUM <= 5`,
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadCSV = () => {
    if (!results || !results.data.length) return;

    const csvContent = [
      results.columns.join(","),
      ...results.data.map((row) =>
        results.columns.map((col) => JSON.stringify(row[col] || "")).join(",")
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

      <div className="flex-1 flex overflow-hidden">
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
                      // Get the current editor value to avoid stale closure
                      const currentEditorValue = ed.getValue();
                      executeQuery(currentEditorValue);
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
          <div className="flex-1 bg-white overflow-hidden">
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

                  <button
                    onClick={downloadCSV}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </div>

                {/* Results Table */}
                <div className="flex-1 overflow-auto">
                  {results.data.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {results.columns.map((column) => (
                            <th
                              key={column}
                              className="px-4 py-2 text-left font-medium text-gray-900 border-b"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.data.map((row, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            {results.columns.map((column) => (
                              <td
                                key={column}
                                className="px-4 py-2 text-gray-700"
                              >
                                {String(row[column] || "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-gray-500">
                      No results returned
                    </div>
                  )}
                </div>
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
    </div>
  );
};
