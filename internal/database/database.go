package database

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database URL: %w", err)
	}

	// Connection pool tuning for production
	config.MaxConns = 25                        // max simultaneous connections
	config.MinConns = 5                         // keep 5 idle connections ready
	config.MaxConnLifetime = 1 * time.Hour      // recycle connections after 1 hour
	config.MaxConnIdleTime = 15 * time.Minute   // close idle connections after 15 min
	config.HealthCheckPeriod = 30 * time.Second // check dead connections every 30s

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return pool, nil
}
