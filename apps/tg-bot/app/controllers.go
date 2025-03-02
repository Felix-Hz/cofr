package app

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"remind0/db"
)

func HandleWppMessage(context *gin.Context) {
	// Extract message details from Twilio's request
	from := context.PostForm("From")
	body := context.PostForm("Body")

	// Validate the message
	if !validateMessage(body) {
		context.String(http.StatusBadRequest, "Invalid message.")
		return
	}

	// Parse the message
	category, amount, notes, parseErr := parseMessage(body)
	if parseErr != nil {
		log.Println("Error parsing message:", parseErr)
		context.String(http.StatusBadRequest, "Invalid format. Use: <category> <amount> <optional_notes>")
		return
	}

	// Create the user if it doesn't exist
	var user db.User
	result := db.DBClient.Where("phone = ?", from).First(&user)
	if result.Error != nil {
		user = db.User{Phone: from}
		db.DBClient.Create(&user)
	}

	// Create the expense linked to the user
	expense := db.Expense{
		UserID:   user.ID,
		Category: category,
		Amount:   amount,
		Notes:    notes,
	}
	db.DBClient.Create(&expense)

	// Send a response back to Twilio
	context.String(http.StatusOK, fmt.Sprintf("Message stored for %s.", from))
}
