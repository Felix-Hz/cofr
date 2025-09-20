package app

import (
	"fmt"
	"log"
	"os"
	"strings"

	dotEnv "github.com/joho/godotenv"
)

type Config struct {
	TursoDSN       string
	TursoAuthToken string
	TelegramToken  string
}

func LoadConfig() (*Config, error) {

	if os.Getenv("ENV") != "production" {
		err := dotEnv.Load()
		if err != nil {
			log.Fatal("⚠️ Failed to load environment variables")
		}
	}

	config := &Config{
		TursoDSN:       os.Getenv("TURSO_DATABASE_URL"),
		TursoAuthToken: os.Getenv("TURSO_AUTH_TOKEN"),
		TelegramToken:  os.Getenv("TELEGRAM_BOT_TOKEN"),
	}

	missing := make([]string, 0)
	if config.TursoDSN == "" {
		missing = append(missing, "TURSO_DATABASE_URL")
	}
	if config.TursoAuthToken == "" {
		missing = append(missing, "TURSO_AUTH_TOKEN")
	}
	if config.TelegramToken == "" {
		missing = append(missing, "TELEGRAM_BOT_TOKEN")
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("⚠️ Missing required environment variables: %s", strings.Join(missing, ", "))
	}

	log.Println("✅ Configuration loaded successfully")

	return config, nil
}
