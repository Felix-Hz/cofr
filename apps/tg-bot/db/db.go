package db

import (
	"log"
	"time"

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

	sqlDB, err := DBClient.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	log.Println("✅ Database connection established")

	return DBClient, nil
}
