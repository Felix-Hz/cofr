package db

import (
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DBClient *gorm.DB

func InitialiseDB() {
	var err error

	DBClient, err = gorm.Open(sqlite.Open("finance.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("<!> Failed to connect to database: %v", err)
	}
	log.Println("> Database connection established")

	// Run migrations
	models := []interface{}{&User{}, &Transaction{}, &Offset{}}
	err = DBClient.AutoMigrate(models...)
	if err != nil {
		log.Fatalf("<!> Migration failed: %v", err)
	}

	log.Println("> Database migrated successfully")
}
