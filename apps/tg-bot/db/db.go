package db

import (
	"fmt"
	"log"

	_ "github.com/tursodatabase/libsql-client-go/libsql"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

/**
 * Database client instance (Turso)
 *
 * <!> TODO: Need to handle the closing of the DB connection gracefully 🥴
 */

var DBClient *gorm.DB

func InitialiseDB(DSN string) (*gorm.DB, error) {
	var err error

	// Setup custom dialector for the sqlite provider:
	tursoDialector := sqlite.Config{DriverName: "turso", DSN: DSN}

	// Connect to the database:
	DBClient, err = gorm.Open(sqlite.New(tursoDialector), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	log.Println("> Database connection established")

	// Run required migrations:
	err = DBClient.AutoMigrate(&User{}, &Transaction{}, &Offset{})
	if err != nil {
		return nil, fmt.Errorf("<!> Migration failed: %v", err)
	}
	log.Println("> Database migrated successfully")

	return DBClient, nil
}
