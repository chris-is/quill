import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { DuckDBService, getDuckDBService } from "./duckdb";

interface DuckDBContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  service: DuckDBService | null;
  tables: string[];
  loadData: (
    file: File,
    separator?: string,
    hasHeader?: boolean
  ) => Promise<void>;
  query: (sql: string) => Promise<any[]>;
  refreshTables: () => Promise<void>;
}

const DuckDBContext = createContext<DuckDBContextType | undefined>(undefined);

interface DuckDBProviderProps {
  children: ReactNode;
}

export const DuckDBProvider: React.FC<DuckDBProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<DuckDBService | null>(null);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    initializeDuckDB();
  }, []);

  const initializeDuckDB = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const duckdbService = getDuckDBService();
      await duckdbService.initialize();

      setService(duckdbService);
      setIsInitialized(true);

      // Load initial tables
      await refreshTables();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize DuckDB"
      );
      console.error("DuckDB initialization error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (
    file: File,
    separator?: string,
    hasHeader?: boolean
  ): Promise<void> => {
    if (!service) {
      throw new Error("DuckDB service not initialized");
    }

    try {
      setIsLoading(true);
      setError(null);

      // Upload file to backend and get Arrow data
      const formData = new FormData();
      formData.append("file", file);

      // Build query string for CSV configuration
      const queryParams = new URLSearchParams();
      if (separator) {
        queryParams.append("separator", separator);
      }
      if (hasHeader !== undefined) {
        queryParams.append("hasHeader", hasHeader.toString());
      }
      const queryString = queryParams.toString();
      const url = queryString
        ? `http://localhost:8080/upload?${queryString}`
        : "http://localhost:8080/upload";

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Get Arrow data as array buffer
      const arrowData = await response.arrayBuffer();

      // Debug: Log response info
      console.log("Upload response:", {
        contentType: response.headers.get("Content-Type"),
        dataSize: arrowData.byteLength,
        firstBytes: new Uint8Array(arrowData.slice(0, 20)),
      });

      // Validate we got actual Arrow data (not an error response)
      if (arrowData.byteLength === 0) {
        throw new Error("Server returned empty response");
      }

      // Check if response is JSON error instead of Arrow data
      const firstBytes = new Uint8Array(arrowData.slice(0, 1));
      if (firstBytes[0] === 123) {
        // 123 = '{' - likely a JSON error response
        const errorText = new TextDecoder().decode(arrowData);
        console.error("Server returned error:", errorText);
        throw new Error(`Server error: ${errorText}`);
      }

      // Create table name from filename (remove extension and sanitize)
      const tableName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_]/g, "_");

      // Insert data into DuckDB
      await service.createTableFromArrow(tableName, new Uint8Array(arrowData));

      // Refresh tables list
      await refreshTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      console.error("Data loading error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const query = async (sql: string): Promise<any[]> => {
    if (!service) {
      throw new Error("DuckDB service not initialized");
    }

    try {
      setError(null);
      return await service.query(sql);
    } catch (err) {
      console.error("Query error:", err);
      throw err;
    }
  };

  const refreshTables = async (): Promise<void> => {
    if (!service) return;

    try {
      const tableList = await service.getTables();
      setTables(tableList);
    } catch (err) {
      console.error("Failed to refresh tables:", err);
    }
  };

  const value: DuckDBContextType = {
    isInitialized,
    isLoading,
    error,
    service,
    tables,
    loadData,
    query,
    refreshTables,
  };

  return (
    <DuckDBContext.Provider value={value}>{children}</DuckDBContext.Provider>
  );
};

export const useDuckDB = (): DuckDBContextType => {
  const context = useContext(DuckDBContext);
  if (context === undefined) {
    throw new Error("useDuckDB must be used within a DuckDBProvider");
  }
  return context;
};
