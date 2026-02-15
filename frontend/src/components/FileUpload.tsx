import React, { useCallback, useState } from "react";
import { Upload, FileText, Database } from "lucide-react";
import { useDuckDB } from "../lib/DuckDBContext";
import { Box, Stack, NativeSelect, Checkbox, Button } from "@chakra-ui/react";

interface FileUploadProps {
  onDataLoaded?: (tableName: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [separator, setSeparator] = useState<string>("comma");
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const { loadData, isLoading } = useDuckDB();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelection(files[0]);
      }
      // Reset input value to allow selecting the same file again
      e.target.value = "";
    },
    [],
  );

  const handleFileSelection = (file: File) => {
    const isCSV = file.name.toLowerCase().endsWith(".csv");

    if (isCSV) {
      // For CSV files, store and show settings
      setSelectedFile(file);
      setSeparator("comma");
      setHasHeader(true);
    } else {
      // For non-CSV files, upload immediately
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (
    file: File,
    csvSeparator?: string,
    csvHasHeader?: boolean,
  ) => {
    try {
      setUploadStatus("uploading");
      setSelectedFile(null); // Clear selected file

      await loadData(file, csvSeparator, csvHasHeader);

      const tableName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_]/g, "_");
      setUploadStatus("success");
      onDataLoaded?.(tableName);

      // Reset status after 3 seconds
      setTimeout(() => setUploadStatus("idle"), 3000);
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("error");
      setTimeout(() => setUploadStatus("idle"), 3000);
    }
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      handleFileUpload(selectedFile, separator, hasHeader);
    }
  };

  const handleCancelClick = () => {
    setSelectedFile(null);
    setSeparator("comma");
    setHasHeader(true);
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case "uploading":
        return "border-blue-400 bg-blue-50";
      case "success":
        return "border-green-400 bg-green-50";
      case "error":
        return "border-red-400 bg-red-50";
      default:
        return isDragOver
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 bg-gray-50";
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case "uploading":
        return "Uploading and processing...";
      case "success":
        return "Data loaded successfully!";
      case "error":
        return "Upload failed. Please try again.";
      default:
        return "Drop your CSV, JSON or Parquet files here, or click to browse";
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case "uploading":
        return <Database className="w-8 h-8 text-blue-500 animate-spin" />;
      case "success":
        return <Database className="w-8 h-8 text-green-500" />;
      case "error":
        return <FileText className="w-8 h-8 text-red-500" />;
      default:
        return <Upload className="w-8 h-8 text-gray-400" />;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${getStatusColor()}
          ${!isLoading && uploadStatus === "idle" ? "hover:border-blue-400 hover:bg-blue-50 cursor-pointer" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isLoading && uploadStatus === "idle") {
            document.getElementById("file-input")?.click();
          }
        }}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.json,.parquet"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center space-y-4">
          {getStatusIcon()}

          <div>
            <p className="text-lg font-medium text-gray-700">
              {getStatusText()}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Supports CSV, JSON and Parquet files
            </p>
          </div>

          {uploadStatus === "idle" && !isLoading && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                document.getElementById("file-input")?.click();
              }}
            >
              Browse Files
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Files are processed locally in your browser using DuckDB WebAssembly
      </div>

      {/* CSV Settings Panel */}
      {selectedFile && (
        <Box
          mt={4}
          p={4}
          borderWidth="1px"
          borderRadius="lg"
          borderColor="blue.300"
          bg="blue.50"
        >
          <Stack gap={4}>
            <Box>
              <p className="text-sm font-medium text-gray-700 mb-2">
                CSV Configuration for: {selectedFile.name}
              </p>
            </Box>

            <Box>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Separator
              </label>
              <NativeSelect.Root size="sm" disabled={isLoading}>
                <NativeSelect.Field
                  value={separator}
                  onChange={(e) => setSeparator(e.currentTarget.value)}
                >
                  <option value="comma">Comma (,)</option>
                  <option value="semicolon">Semicolon (;)</option>
                  <option value="tab">Tab</option>
                  <option value="pipe">Pipe (|)</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Box>

            <Checkbox.Root
              checked={hasHeader}
              onCheckedChange={(e) => setHasHeader(!!e.checked)}
              disabled={isLoading}
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>First row is header</Checkbox.Label>
            </Checkbox.Root>

            <Box display="flex" gap={2}>
              <Button
                colorPalette="blue"
                onClick={handleUploadClick}
                disabled={isLoading}
                flex={1}
              >
                Upload File
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelClick}
                px={2}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </Box>
          </Stack>
        </Box>
      )}
    </div>
  );
};
