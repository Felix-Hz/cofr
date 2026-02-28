package db

import (
	"fmt"
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

	// Run required migrations:
	err = DBClient.AutoMigrate(&User{}, &Transaction{}, &Offset{})
	if err != nil {
		return nil, fmt.Errorf("⚠️ Migration failed: %v", err)
	}
	log.Println("✅ Database migrated successfully")

	return DBClient, nil
}
