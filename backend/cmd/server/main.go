package main

import (
	"log"
	"quill/backend/internal/server"
)

func main() {
	srv := server.NewServer()

	log.Println("Starting Quill backend server on :8080")
	if err := srv.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
