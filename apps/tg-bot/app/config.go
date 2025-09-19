package app

import (
	"fmt"
	dotEnv "github.com/joho/godotenv"
	"log"
	"os"
	"strings"
)

type Config struct {
	TursoDBUrl     string
	TursoAuthToken string
	TelegramToken  string
}

func LoadConfig() (*Config, error) {

	if os.Getenv("ENV") != "production" {
		err := dotEnv.Load()
		if err != nil {
			log.Fatal("<!> Failed to load environment variables")
		}
	}

	config := &Config{
		TursoDBUrl:     os.Getenv("TURSO_DATABASE_URL"),
		TursoAuthToken: os.Getenv("TURSO_AUTH_TOKEN"),
		TelegramToken:  os.Getenv("TELEGRAM_BOT_TOKEN"),
	}

	missing := make([]string, 0)
	if config.TursoDBUrl == "" {
		missing = append(missing, "TURSO_DATABASE_URL")
	}
	if config.TursoAuthToken == "" {
		missing = append(missing, "TURSO_AUTH_TOKEN")
	}
	if config.TelegramToken == "" {
		missing = append(missing, "TELEGRAM_BOT_TOKEN")
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("<!> Missing required environment variables: %s", strings.Join(missing, ", "))
	}

	return config, nil
}
