package admin

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service     *Service
	adminEmails map[string]bool
}

func NewHandler(service *Service) *Handler {
	emails := map[string]bool{
		"wahyuarmanda2@gmail.com": true,
	}
	if extra := os.Getenv("ADMIN_EMAILS"); extra != "" {
		for _, e := range strings.Split(extra, ",") {
			emails[strings.TrimSpace(e)] = true
		}
	}
	return &Handler{service: service, adminEmails: emails}
}

func (h *Handler) AdminOnly(c *fiber.Ctx) error {
	email, _ := c.Locals("user_email").(string)
	if !h.adminEmails[email] {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "akses admin diperlukan",
		})
	}
	return c.Next()
}

func (h *Handler) Dashboard(c *fiber.Ctx) error {
	data, err := h.service.GetDashboard(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal ambil data admin",
		})
	}
	return c.JSON(data)
}

func (h *Handler) CheckAdmin(c *fiber.Ctx) error {
	email, _ := c.Locals("user_email").(string)
	return c.JSON(fiber.Map{
		"is_admin": h.adminEmails[email],
	})
}

func (h *Handler) Growth(c *fiber.Ctx) error {
	data, err := h.service.GetGrowth(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "gagal ambil data growth",
		})
	}
	return c.JSON(data)
}

func (h *Handler) TrackPageView(c *fiber.Ctx) error {
	var body struct {
		Path     string `json:"path"`
		Referrer string `json:"referrer"`
	}
	if err := c.BodyParser(&body); err != nil || body.Path == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "path wajib diisi"})
	}

	ip := c.Get("X-Real-IP")
	if ip == "" {
		ip = c.Get("X-Forwarded-For")
	}
	if ip == "" {
		ip = c.IP()
	}
	ua := c.Get("User-Agent")
	_, isAuth := c.Locals("user_email").(string)

	_ = h.service.TrackPageView(c.Context(), body.Path, ip, ua, body.Referrer, isAuth)
	return c.JSON(fiber.Map{"ok": true})
}
