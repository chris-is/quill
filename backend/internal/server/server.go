package server

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/apache/arrow/go/v14/arrow"
	"github.com/apache/arrow/go/v14/arrow/array"
	"github.com/apache/arrow/go/v14/arrow/ipc"
	"github.com/apache/arrow/go/v14/arrow/memory"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Server struct {
	router *gin.Engine
	pool   memory.Allocator
}

func NewServer() *Server {
	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// CORS middleware for frontend communication
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	router.Use(cors.New(config))

	pool := memory.NewGoAllocator()

	s := &Server{
		router: router,
		pool:   pool,
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	s.router.POST("/upload", s.handleFileUpload)
	s.router.GET("/health", s.handleHealth)
}

func (s *Server) Run(addr string) error {
	return s.router.Run(addr)
}

func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "healthy"})
}

func (s *Server) handleFileUpload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file from request"})
		return
	}
	defer file.Close()

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file content"})
		return
	}

	// Convert to Arrow format based on file type
	arrowData, err := s.convertToArrow(content, header.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to convert to Arrow: %v", err)})
		return
	}

	// Set headers for Arrow streaming
	c.Header("Content-Type", "application/vnd.apache.arrow.stream")
	c.Header("Access-Control-Expose-Headers", "Content-Type")

	// Stream Arrow data
	c.Data(http.StatusOK, "application/vnd.apache.arrow.stream", arrowData)
}

func (s *Server) convertToArrow(content []byte, filename string) ([]byte, error) {
	// Determine file type by extension
	if strings.HasSuffix(strings.ToLower(filename), ".csv") {
		return s.convertCSVToArrow(content)
	} else if strings.HasSuffix(strings.ToLower(filename), ".json") {
		return s.convertJSONToArrow(content)
	}

	return nil, fmt.Errorf("unsupported file type: %s", filename)
}

func (s *Server) convertCSVToArrow(content []byte) ([]byte, error) {
	reader := csv.NewReader(bytes.NewReader(content))

	// Read all records
	records, err := reader.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to parse CSV: %v", err)
	}

	if len(records) == 0 {
		return nil, fmt.Errorf("empty CSV file")
	}

	// Use first row as headers
	headers := records[0]
	dataRows := records[1:]

	// Build Arrow schema - assume all columns are strings for simplicity
	fields := make([]arrow.Field, len(headers))
	for i, header := range headers {
		fields[i] = arrow.Field{Name: header, Type: arrow.BinaryTypes.String}
	}
	schema := arrow.NewSchema(fields, nil)

	// Create Arrow record
	builders := make([]array.Builder, len(headers))
	for i := range builders {
		builders[i] = array.NewStringBuilder(s.pool)
	}

	// Add data to builders
	for _, row := range dataRows {
		for i, value := range row {
			if i < len(builders) {
				builders[i].(*array.StringBuilder).Append(value)
			}
		}
	}

	// Build arrays
	arrays := make([]arrow.Array, len(builders))
	for i, builder := range builders {
		arrays[i] = builder.NewArray()
		builder.Release()
	}

	// Create record
	record := array.NewRecord(schema, arrays, int64(len(dataRows)))
	defer record.Release()

	// Convert to Arrow IPC stream format
	var buf bytes.Buffer
	writer := ipc.NewWriter(&buf, ipc.WithSchema(schema))
	defer writer.Close()

	if err := writer.Write(record); err != nil {
		return nil, fmt.Errorf("failed to write Arrow record: %v", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close Arrow writer: %v", err)
	}

	return buf.Bytes(), nil
}

func (s *Server) convertJSONToArrow(content []byte) ([]byte, error) {
	// Parse JSON array
	var records []map[string]interface{}
	if err := json.Unmarshal(content, &records); err != nil {
		return nil, fmt.Errorf("failed to parse JSON: %v", err)
	}

	if len(records) == 0 {
		return nil, fmt.Errorf("empty JSON array")
	}

	// Extract field names from first record
	var fieldNames []string
	for key := range records[0] {
		fieldNames = append(fieldNames, key)
	}

	// Build Arrow schema - assume all fields are strings for simplicity
	fields := make([]arrow.Field, len(fieldNames))
	for i, name := range fieldNames {
		fields[i] = arrow.Field{Name: name, Type: arrow.BinaryTypes.String}
	}
	schema := arrow.NewSchema(fields, nil)

	// Create builders
	builders := make([]array.Builder, len(fieldNames))
	for i := range builders {
		builders[i] = array.NewStringBuilder(s.pool)
	}

	// Add data to builders
	for _, record := range records {
		for i, fieldName := range fieldNames {
			value := ""
			if v, exists := record[fieldName]; exists && v != nil {
				value = fmt.Sprintf("%v", v)
			}
			builders[i].(*array.StringBuilder).Append(value)
		}
	}

	// Build arrays
	arrays := make([]arrow.Array, len(builders))
	for i, builder := range builders {
		arrays[i] = builder.NewArray()
		builder.Release()
	}

	// Create record
	arrowRecord := array.NewRecord(schema, arrays, int64(len(records)))
	defer arrowRecord.Release()

	// Convert to Arrow IPC stream format
	var buf bytes.Buffer
	writer := ipc.NewWriter(&buf, ipc.WithSchema(schema))
	defer writer.Close()

	if err := writer.Write(arrowRecord); err != nil {
		return nil, fmt.Errorf("failed to write Arrow record: %v", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close Arrow writer: %v", err)
	}

	return buf.Bytes(), nil
}

func convertParquetToArrow(content []byte) ([]byte, error) {
	println("What am I doing...")
	return []byte{0, 0, 0}, nil
}
