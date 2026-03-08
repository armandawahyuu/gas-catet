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
