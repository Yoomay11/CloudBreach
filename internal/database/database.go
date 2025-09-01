package database

import (
	"context"
	"database/sql"
	"fmt"

	"cloudsecops/internal/config"

	"github.com/redis/go-redis/v9"
	_ "github.com/lib/pq"
)

// Init 初始化数据库连接
func Init(cfg config.DatabaseConfig) (*sql.DB, error) {
	var db *sql.DB
	var err error

	switch cfg.Type {
	case "sqlite":
		// SQLite支持需要额外的依赖，暂时跳过
		return nil, fmt.Errorf("SQLite support not available, please use PostgreSQL")
	case "postgres":
		dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)
		db, err = sql.Open("postgres", dsn)
	default:
		return nil, fmt.Errorf("unsupported database type: %s", cfg.Type)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// 设置连接池参数
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)

	return db, nil
}

// InitRedis 初始化Redis连接
func InitRedis(cfg config.RedisConfig) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	// 测试连接
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return client, nil
}