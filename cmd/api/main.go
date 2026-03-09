package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"gas-catet/internal/admin"
	"gas-catet/internal/analytics"
	"gas-catet/internal/category"
	"gas-catet/internal/database"
	"gas-catet/internal/feedback"
	"gas-catet/internal/goal"
	"gas-catet/internal/payment"
	"gas-catet/internal/plangating"
	"gas-catet/internal/recurring"
	"gas-catet/internal/telegram"
	"gas-catet/internal/transaction"
	"gas-catet/internal/tripay"
	"gas-catet/internal/user"
	"gas-catet/internal/wallet"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
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
	geminiAPIKey := os.Getenv("GEMINI_API_KEY")
	geminiBaseURL := os.Getenv("GEMINI_BASE_URL")
	geminiModel := os.Getenv("GEMINI_MODEL")
	mayarWebhookSecret := os.Getenv("MAYAR_WEBHOOK_SECRET")

	// Tripay
	tripayAPIKey := os.Getenv("TRIPAY_API_KEY")
	tripayPrivateKey := os.Getenv("TRIPAY_PRIVATE_KEY")
	tripayMerchantCode := os.Getenv("TRIPAY_MERCHANT_CODE")
	tripayMode := os.Getenv("TRIPAY_MODE")  // "sandbox" or "production"
	appBaseURL := os.Getenv("APP_BASE_URL") // e.g. https://gascatet.my.id

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
	userService := user.NewService(userQueries, jwtSecret, pool)
	userHandler := user.NewHandler(userService)

	txQueries := transaction.New(pool)
	txService := transaction.NewService(txQueries)

	analyticsQueries := analytics.New(pool)
	analyticsSvc := analytics.NewService(analyticsQueries)
	analyticsHandler := analytics.NewHandler(analyticsSvc, pool)

	catQueries := category.New(pool)
	catService := category.NewService(catQueries)
	catHandler := category.NewHandler(catService)

	walQueries := wallet.New(pool)
	walService := wallet.NewService(walQueries, pool)
	walHandler := wallet.NewHandler(walService)

	txHandler := transaction.NewHandler(txService, walService)

	recQueries := recurring.New(pool)
	recService := recurring.NewService(recQueries, txService)
	recService.SetWalletUpdater(walService)
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
		tgHandler.SetAnalytics(analyticsSvc)

		// Auto report scheduler
		reporter := telegram.NewReporter(bot, userService, txService)
		reporter.StartDailyReport()
		tgHandler.SetReporter(reporter)

		// Receipt OCR (optional — only if Gemini key is set)
		if geminiAPIKey != "" && geminiBaseURL != "" {
			if geminiModel == "" {
				geminiModel = "gemini/gemini-2.0-flash-lite"
			}
			ocrSvc := telegram.NewOCRService(geminiAPIKey, geminiBaseURL, geminiModel)
			tgHandler.SetOCR(ocrSvc)
			reporter.SetOCR(ocrSvc)
			reporter.SetAnalytics(analyticsSvc)
			analyticsHandler.SetRoastGenerator(ocrSvc)
			log.Println("Receipt OCR enabled (Gemini Vision)")
		}

		log.Println("Telegram Bot enabled (with daily report scheduler)")
	} else {
		log.Println("Telegram Bot disabled (TELEGRAM_BOT_TOKEN not set)")
	}

	app := fiber.New(fiber.Config{
		AppName:      "GasCatet API",
		BodyLimit:    10 * 1024 * 1024, // 10MB
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
		// Do not expose server header
		ServerHeader: "",
	})

	app.Use(logger.New())
	app.Use(recover.New())

	// Security headers
	app.Use(func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		c.Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:")
		c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		return c.Next()
	})

	// CORS — restrict to allowed origins instead of wildcard
	allowedOrigins := os.Getenv("CORS_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3001,http://localhost:3000"
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: false,
		MaxAge:           3600,
	}))

	// Global rate limiter: 100 requests per minute per IP
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			if ip := c.Get("X-Real-IP"); ip != "" {
				return ip
			}
			if xff := c.Get("X-Forwarded-For"); xff != "" {
				return strings.SplitN(xff, ",", 2)[0]
			}
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "terlalu banyak request, coba lagi nanti",
			})
		},
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "app": "GasCatet"})
	})

	// Serve uploaded files (browse disabled)
	app.Static("/uploads", "./uploads", fiber.Static{
		Browse: false,
	})

	api := app.Group("/api")

	// Stricter rate limit on auth routes: 10 attempts per minute to prevent brute force
	authLimiter := limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			if ip := c.Get("X-Real-IP"); ip != "" {
				return "auth:" + ip
			}
			if xff := c.Get("X-Forwarded-For"); xff != "" {
				return "auth:" + strings.SplitN(xff, ",", 2)[0]
			}
			return "auth:" + c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "terlalu banyak percobaan login, tunggu 1 menit",
			})
		},
	})

	auth := api.Group("/auth", authLimiter)
	auth.Post("/register", userHandler.Register)
	auth.Post("/login", userHandler.Login)

	userGroup := api.Group("/user", userHandler.AuthMiddleware)
	userGroup.Get("/profile", userHandler.GetProfile)
	userGroup.Put("/profile", userHandler.UpdateProfile)
	userGroup.Put("/password", userHandler.ChangePassword)
	userGroup.Post("/link-telegram", userHandler.GenerateLinkToken)
	userGroup.Delete("/link-telegram", userHandler.UnlinkTelegram)

	txGroup := api.Group("/transactions", userHandler.AuthMiddleware)
	txGroup.Post("/", txHandler.Create)
	txGroup.Get("/", txHandler.List)
	txGroup.Get("/summary", txHandler.MonthlySummary)
	txGroup.Get("/today", txHandler.TodaySummary)
	txGroup.Get("/export", plangating.RequirePro(pool), txHandler.ExportCSV)
	txGroup.Get("/:id", txHandler.GetByID)
	txGroup.Put("/:id", txHandler.Update)
	txGroup.Delete("/:id", txHandler.Delete)
	txGroup.Post("/:id/receipt", txHandler.UploadReceipt)
	txGroup.Delete("/:id/receipt", txHandler.DeleteReceipt)

	catGroup := api.Group("/categories", userHandler.AuthMiddleware)
	catGroup.Get("/", catHandler.List)
	catGroup.Post("/", catHandler.Create)
	catGroup.Delete("/:id", catHandler.Delete)

	proPlan := plangating.RequirePro(pool)

	budgetGroup := api.Group("/budgets", userHandler.AuthMiddleware, proPlan)
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

	recGroup := api.Group("/recurring", userHandler.AuthMiddleware, proPlan)
	recGroup.Get("/", recHandler.List)
	recGroup.Post("/", recHandler.Create)
	recGroup.Put("/:id", recHandler.Update)
	recGroup.Patch("/:id/toggle", recHandler.Toggle)
	recGroup.Delete("/:id", recHandler.Delete)

	goalGroup := api.Group("/goals", userHandler.AuthMiddleware, proPlan)
	goalGroup.Get("/", goalHandler.List)
	goalGroup.Post("/", goalHandler.Create)
	goalGroup.Put("/:id", goalHandler.Update)
	goalGroup.Patch("/:id/add", goalHandler.AddAmount)
	goalGroup.Delete("/:id", goalHandler.Delete)

	analyticsGroup := api.Group("/analytics", userHandler.AuthMiddleware)
	analyticsGroup.Get("/summary", analyticsHandler.Summary)
	analyticsGroup.Get("/daily", analyticsHandler.Daily)
	analyticsGroup.Get("/trend", proPlan, analyticsHandler.Trend)
	analyticsGroup.Get("/top-expenses", analyticsHandler.TopExpenses)
	analyticsGroup.Get("/categories", analyticsHandler.Categories)
	analyticsGroup.Get("/roast", analyticsHandler.Roast)

	// Feedback (auth required)
	feedbackHandler := feedback.NewHandler(pool)
	api.Post("/feedback", userHandler.AuthMiddleware, feedbackHandler.Submit)

	adminGroup := api.Group("/admin", userHandler.AuthMiddleware, adminHandler.AdminOnly)
	adminGroup.Get("/dashboard", adminHandler.Dashboard)
	adminGroup.Get("/growth", adminHandler.Growth)
	adminGroup.Get("/analytics", adminHandler.Analytics)
	adminGroup.Get("/feedbacks", feedbackHandler.ListAll)

	// Check admin status (auth required, no admin-only)
	api.Get("/admin/check", userHandler.AuthMiddleware, adminHandler.CheckAdmin)

	// Public page view tracking (no auth required)
	api.Post("/track", adminHandler.TrackPageView)

	// Telegram bot info (public)
	telegramBotUsername := os.Getenv("TELEGRAM_BOT_USERNAME")
	app.Get("/api/telegram/info", func(c *fiber.Ctx) error {
		enabled := telegramToken != "" && telegramBotUsername != ""
		return c.JSON(fiber.Map{
			"enabled":  enabled,
			"username": telegramBotUsername,
		})
	})

	// Mayar payment webhook (public — verified by HMAC signature)
	paymentAdapter := payment.NewUserQueriesAdapter(userQueries)
	paymentHandler := payment.NewHandler(mayarWebhookSecret, paymentAdapter)
	app.Post("/api/webhook/mayar", paymentHandler.Webhook)

	// Tripay payment integration
	if tripayAPIKey != "" {
		tripayClient := tripay.NewClient(tripayAPIKey, tripayPrivateKey, tripayMerchantCode, tripayMode == "sandbox")
		tripayPlanAdapter := tripay.NewPlanAdapter(userQueries)
		tripayHandler := tripay.NewHandler(tripayClient, pool, tripayPlanAdapter, appBaseURL)

		// Public webhook endpoint
		app.Post("/api/webhooks/tripay", tripayHandler.Webhook)

		// Authenticated API endpoints
		payGroup := api.Group("/payment", userHandler.AuthMiddleware)
		payGroup.Get("/channels", tripayHandler.GetPaymentChannels)
		payGroup.Post("/create-order", tripayHandler.CreateOrder)
	}

	// Telegram webhook (verified by secret token in header)
	telegramWebhookSecret := os.Getenv("TELEGRAM_WEBHOOK_SECRET")
	if tgHandler != nil {
		app.Post("/webhook/telegram", func(c *fiber.Ctx) error {
			// Verify Telegram secret token if configured
			if telegramWebhookSecret != "" {
				if c.Get("X-Telegram-Bot-Api-Secret-Token") != telegramWebhookSecret {
					return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "invalid secret"})
				}
			}
			return tgHandler.Webhook(c)
		})
	}

	// Graceful shutdown: wait for SIGINT/SIGTERM, then drain connections
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("GasCatet running on :%s", port)
		if err := app.Listen(":" + port); err != nil {
			log.Printf("Server error: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}

	pool.Close()
	log.Println("Server stopped")
}
