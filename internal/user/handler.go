package user

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
)

type Handler struct {
	service    *Service
	onRegister func(ctx context.Context, userID pgtype.UUID)
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) SetOnRegister(fn func(ctx context.Context, userID pgtype.UUID)) {
	h.onRegister = fn
}

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "request body tidak valid",
		})
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "email, password, dan name wajib diisi",
		})
	}

	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "password minimal 8 karakter",
		})
	}

	resp, err := h.service.Register(c.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		if err == ErrEmailAlreadyExists {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal registrasi",
		})
	}

	// Seed default categories for new user
	if h.onRegister != nil {
		userUUID, parseErr := stringToUUID(resp.User.ID)
		if parseErr == nil {
			h.onRegister(c.Context(), userUUID)
		}
	}

	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *Handler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "request body tidak valid",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "email dan password wajib diisi",
		})
	}

	resp, err := h.service.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		if err == ErrInvalidCredentials {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal login",
		})
	}

	return c.JSON(resp)
}

func (h *Handler) GetProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	resp, err := h.service.GetProfile(c.Context(), userID)
	if err != nil {
		if err == ErrUserNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal ambil profile",
		})
	}

	return c.JSON(resp)
}

func (h *Handler) GenerateLinkToken(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	token := h.service.GenerateLinkToken(userID)

	return c.JSON(fiber.Map{
		"link_token": token,
		"message":    "Kirim token ini ke Bot Telegram GasCatet untuk menghubungkan akun kamu. Token berlaku 10 menit.",
	})
}

func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
	}

	if req.Name == "" || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "nama dan email wajib diisi"})
	}

	resp, err := h.service.UpdateProfile(c.Context(), userID, req.Name, req.Email)
	if err != nil {
		if err == ErrEmailAlreadyExists {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal update profil"})
	}

	return c.JSON(resp)
}

func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "request body tidak valid"})
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password lama dan baru wajib diisi"})
	}

	if len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password baru minimal 8 karakter"})
	}

	err := h.service.ChangePassword(c.Context(), userID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		if err == ErrInvalidCredentials {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password lama salah"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal ganti password"})
	}

	return c.JSON(fiber.Map{"message": "password berhasil diubah"})
}

func (h *Handler) AuthMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "token tidak ditemukan",
		})
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "format token tidak valid, gunakan: Bearer <token>",
		})
	}

	userID, email, err := h.service.ValidateJWT(tokenString)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "token tidak valid atau sudah kadaluarsa",
		})
	}

	c.Locals("user_id", userID)
	c.Locals("user_email", email)
	return c.Next()
}

func (h *Handler) UnlinkTelegram(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(pgtype.UUID)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	resp, err := h.service.UnlinkTelegram(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "gagal putuskan koneksi telegram"})
	}

	return c.JSON(resp)
}
