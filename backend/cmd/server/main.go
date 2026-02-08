package main

import (
	"quill/backend/internal/server"

	log "github.com/sirupsen/logrus"
)

func main() {
	log.SetFormatter(&log.TextFormatter{
		FullTimestamp: true,
	})

	srv := server.NewServer()

	log.WithField("port", 8080).Info("Starting Quill backend server")
	if err := srv.Run(":8080"); err != nil {
		log.WithError(err).Fatal("Failed to start server")
	}
}