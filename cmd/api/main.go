package main

import (
	"context"
	"log"
	"os"

	"gas-catet/internal/admin"
	"gas-catet/internal/analytics"
	"gas-catet/internal/category"
	"gas-catet/internal/database"
	"gas-catet/internal/goal"
	"gas-catet/internal/recurring"
	"gas-catet/internal/telegram"
	"gas-catet/internal/transaction"
	"gas-catet/internal/user"
	"gas-catet/internal/wallet"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL wajib diset")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET wajib diset")
	}

	telegramToken := os.Getenv("TELEGRAM_BOT_TOKEN")

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "3000"
	}

	ctx := context.Background()
	pool, err := database.Connect(ctx, dbURL)
	if err != nil {
		log.Fatalf("Gagal konek database: %v", err)
	}
	defer pool.Close()

	log.Println("Database connected")

	userQueries := user.New(pool)
	userService := user.NewService(userQueries, jwtSecret)
	userHandler := user.NewHandler(userService)

	txQueries := transaction.New(pool)
	txService := transaction.NewService(txQueries)

	analyticsQueries := analytics.New(pool)
	analyticsSvc := analytics.NewService(analyticsQueries)
	analyticsHandler := analytics.NewHandler(analyticsSvc)

	catQueries := category.New(pool)
	catService := category.NewService(catQueries)
	catHandler := category.NewHandler(catService)

	walQueries := wallet.New(pool)
	walService := wallet.NewService(walQueries)
	walHandler := wallet.NewHandler(walService)

	txHandler := transaction.NewHandler(txService, walService)

	recQueries := recurring.New(pool)
	recService := recurring.NewService(recQueries, txService)
	recHandler := recurring.NewHandler(recService)

	goalQueries := goal.New(pool)
	goalService := goal.NewService(goalQueries)
	goalHandler := goal.NewHandler(goalService)

	adminQueries := admin.New(pool)
	adminService := admin.NewService(adminQueries)
	adminHandler := admin.NewHandler(adminService)

	// Start recurring transactions scheduler
	recService.StartScheduler(ctx)

	// Seed default categories on registration
	userHandler.SetOnRegister(func(regCtx context.Context, userID pgtype.UUID) {
		_ = catService.SeedDefaults(regCtx, userID)
		_ = walService.SeedDefaults(regCtx, userID)
	})

	// Telegram Bot (optional - only if token is set)
	var tgHandler *telegram.Handler
	if telegramToken != "" {
		bot := telegram.NewBotClient(telegramToken)
		fsm := telegram.NewFSM()
		tgHandler = telegram.NewHandler(bot, fsm, catService, userService, txService, txQueries, walService)

		// Auto report scheduler
		reporter := telegram.NewReporter(bot, userService, txService)
		reporter.StartDailyReport()
		tgHandler.SetReporter(reporter)

		log.Println("Telegram Bot enabled (with daily report scheduler)")
	} else {
		log.Println("Telegram Bot disabled (TELEGRAM_BOT_TOKEN not set)")
	}

	app := fiber.New(fiber.Config{
		AppName:   "GasCatet API",
		BodyLimit: 10 * 1024 * 1024, // 10MB
	})

	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New())

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "app": "GasCatet"})
	})

	// Serve uploaded files
	app.Static("/uploads", "./uploads")

	api := app.Group("/api")

	auth := api.Group("/auth")
	auth.Post("/register", userHandler.Register)
	auth.Post("/login", userHandler.Login)

	userGroup := api.Group("/user", userHandler.AuthMiddleware)
	userGroup.Get("/profile", userHandler.GetProfile)
	userGroup.Put("/profile", userHandler.UpdateProfile)
	userGroup.Put("/password", userHandler.ChangePassword)
	userGroup.Post("/link-telegram", userHandler.GenerateLinkToken)

	txGroup := api.Group("/transactions", userHandler.AuthMiddleware)
	txGroup.Post("/", txHandler.Create)
	txGroup.Get("/", txHandler.List)
	txGroup.Get("/summary", txHandler.MonthlySummary)
	txGroup.Get("/today", txHandler.TodaySummary)
	txGroup.Get("/export", txHandler.ExportCSV)
	txGroup.Get("/:id", txHandler.GetByID)
	txGroup.Put("/:id", txHandler.Update)
	txGroup.Delete("/:id", txHandler.Delete)
	txGroup.Post("/:id/receipt", txHandler.UploadReceipt)
	txGroup.Delete("/:id/receipt", txHandler.DeleteReceipt)

	catGroup := api.Group("/categories", userHandler.AuthMiddleware)
	catGroup.Get("/", catHandler.List)
	catGroup.Post("/", catHandler.Create)
	catGroup.Delete("/:id", catHandler.Delete)

	budgetGroup := api.Group("/budgets", userHandler.AuthMiddleware)
	budgetGroup.Get("/", catHandler.ListBudgets)
	budgetGroup.Post("/", catHandler.UpsertBudget)
	budgetGroup.Delete("/:id", catHandler.DeleteBudget)

	walGroup := api.Group("/wallets", userHandler.AuthMiddleware)
	walGroup.Get("/", walHandler.List)
	walGroup.Post("/", walHandler.Create)
	walGroup.Put("/:id", walHandler.Update)
	walGroup.Patch("/:id/balance", walHandler.SetBalance)
	walGroup.Delete("/:id", walHandler.Delete)

	transferGroup := api.Group("/transfers", userHandler.AuthMiddleware)
	transferGroup.Get("/", walHandler.ListTransfers)
	transferGroup.Post("/", walHandler.Transfer)
	transferGroup.Delete("/:id", walHandler.DeleteTransfer)

	recGroup := api.Group("/recurring", userHandler.AuthMiddleware)
	recGroup.Get("/", recHandler.List)
	recGroup.Post("/", recHandler.Create)
	recGroup.Put("/:id", recHandler.Update)
	recGroup.Patch("/:id/toggle", recHandler.Toggle)
	recGroup.Delete("/:id", recHandler.Delete)

	goalGroup := api.Group("/goals", userHandler.AuthMiddleware)
	goalGroup.Get("/", goalHandler.List)
	goalGroup.Post("/", goalHandler.Create)
	goalGroup.Put("/:id", goalHandler.Update)
	goalGroup.Patch("/:id/add", goalHandler.AddAmount)
	goalGroup.Delete("/:id", goalHandler.Delete)

	analyticsGroup := api.Group("/analytics", userHandler.AuthMiddleware)
	analyticsGroup.Get("/summary", analyticsHandler.Summary)
	analyticsGroup.Get("/daily", analyticsHandler.Daily)
	analyticsGroup.Get("/trend", analyticsHandler.Trend)
	analyticsGroup.Get("/top-expenses", analyticsHandler.TopExpenses)
	analyticsGroup.Get("/categories", analyticsHandler.Categories)

	adminGroup := api.Group("/admin", userHandler.AuthMiddleware, adminHandler.AdminOnly)
	adminGroup.Get("/dashboard", adminHandler.Dashboard)

	// Check admin status (auth required, no admin-only)
	api.Get("/admin/check", userHandler.AuthMiddleware, adminHandler.CheckAdmin)

	// Telegram bot info (public)
	telegramBotUsername := os.Getenv("TELEGRAM_BOT_USERNAME")
	app.Get("/api/telegram/info", func(c *fiber.Ctx) error {
		enabled := telegramToken != "" && telegramBotUsername != ""
		return c.JSON(fiber.Map{
			"enabled":  enabled,
			"username": telegramBotUsername,
		})
	})

	// Telegram webhook (public - verified by Telegram secret)
	if tgHandler != nil {
		app.Post("/webhook/telegram", tgHandler.Webhook)
	}

	log.Printf("GasCatet running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
