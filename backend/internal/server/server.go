package server

import (
	"bytes"
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/apache/arrow/go/v18/arrow"
	"github.com/apache/arrow/go/v18/arrow/array"
	"github.com/apache/arrow/go/v18/arrow/ipc"
	"github.com/apache/arrow/go/v18/arrow/memory"
	"github.com/apache/arrow/go/v18/parquet/file"
	"github.com/apache/arrow/go/v18/parquet/pqarrow"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
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

	// Set headers for Arrow streaming
	c.Header("Content-Type", "application/vnd.apache.arrow.stream")
	c.Header("Access-Control-Expose-Headers", "Content-Type")

	// Convert to Arrow format based on file type
	if err := s.convertToArrowStream(c.Request.Context(), c.Writer, content, header.Filename); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to convert to Arrow: %v",
			err)})
		return
	}
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

func (s *Server) convertToArrowStream(ctx context.Context, out io.Writer, content []byte, filename string) error {
	if strings.HasSuffix(strings.ToLower(filename), ".parquet") {
		return s.streamParquetToArrowIPC(ctx, out, content)
	}
	// TODO CIXX: For CSV/JSON keep returning []byte for now. Change to stream later.
	arrowData, err := s.convertToArrow(content, filename)
	if err != nil {
		return err
	}
	_, err = out.Write(arrowData)
	return err
}

// bytes.Reader implements io.ReaderAt + io.ReadSeaker; Arrow Parquet reader needs that.
type readerAtSeeker struct{ *bytes.Reader }

func (r readerAtSeeker) ReadAt(p []byte, off int64) (int, error) { return r.Reader.ReadAt(p, off) }

func (s *Server) streamParquetToArrowIPC(ctx context.Context, out io.Writer, parquetBytes []byte) error {
	logger := log.WithField("component", "parquet")
	logger.WithField("bytes", len(parquetBytes)).Info("Processing parquet file")

	src := readerAtSeeker{Reader: bytes.NewReader(parquetBytes)}

	// open parquet reader (Arrow Parquet)
	pr, err := file.NewParquetReader(src)
	if err != nil {
		logger.WithError(err).Error("Failed to open parquet reader")
		return err
	}
	defer pr.Close()

	logger.WithFields(log.Fields{
		"rowGroups": pr.NumRowGroups(),
		"totalRows": pr.NumRows(),
	}).Info("Parquet file metadata")

	// Build Arrow reader that preserves types (Parquet -> Arrow mapping happens here)
	arprops := pqarrow.ArrowReadProperties{BatchSize: 1024}
	afr, err := pqarrow.NewFileReader(pr, arprops, s.pool)
	if err != nil {
		logger.WithError(err).Error("Failed to create Arrow file reader")
		return err
	}

	// Get schema to determine column count
	schema, err := afr.Schema()
	if err != nil {
		logger.WithError(err).Error("Failed to get schema")
		return err
	}
	logger.WithField("fields", schema.NumFields()).Info("Schema loaded")

	// Build column indices for all columns
	numCols := schema.NumFields()
	colIndices := make([]int, numCols)
	for i := range numCols {
		colIndices[i] = i
	}

	// Read row groups directly instead of using GetRecordReader
	// This is more reliable for complex nested types
	var w *ipc.Writer
	rowCount := int64(0)

	for rgIdx := 0; rgIdx < pr.NumRowGroups(); rgIdx++ {
		logger.WithField("rowGroup", rgIdx).Debug("Reading row group")

		tbl, err := afr.ReadRowGroups(ctx, colIndices, []int{rgIdx})
		if err != nil {
			logger.WithError(err).WithField("rowGroup", rgIdx).Error("Failed to read row group")
			return err
		}

		// Create IPC writer using the actual table schema (not afr.Schema())
		// This ensures the schema matches exactly with the record batches
		if w == nil {
			w = ipc.NewWriter(out, ipc.WithSchema(tbl.Schema()))
			defer w.Close()
		}

		// Convert table to record batches and write
		tr := array.NewTableReader(tbl, 1024)

		for tr.Next() {
			rec := tr.Record()
			rowCount += rec.NumRows()
			if err := w.Write(rec); err != nil {
				logger.WithError(err).Error("Failed to write record batch")
				tr.Release()
				tbl.Release()
				return err
			}
			if f, ok := out.(http.Flusher); ok {
				f.Flush()
			}
		}
		tr.Release()
		tbl.Release()
	}

	logger.WithField("rows", rowCount).Info("Successfully streamed parquet data")
	return nil
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
	var records []map[string]any
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
