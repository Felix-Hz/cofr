package db

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

/**
 * Database client instance (PostgreSQL)
 */

var DBClient *gorm.DB

func InitialiseDB(DSN string) (*gorm.DB, error) {
	var err error

	// Connect to the database:
	DBClient, err = gorm.Open(postgres.Open(DSN), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	log.Println("✅ Database connection established")

	return DBClient, nil
}
