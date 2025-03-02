package main

import (
	"remind0/app"
	"remind0/db"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database connection and migrations
	db.InitialiseDB()
	// Setup Gin router
	router := gin.Default()
	// POST webhook for incoming messages from Twilio
	router.POST("/webhook", app.HandleWppMessage)
	// Spin up the server
	router.Run(":8080")
}
