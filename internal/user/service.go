package user

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"time"

	"gas-catet/internal/plangating"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrEmailAlreadyExists = errors.New("email sudah terdaftar")
	ErrInvalidCredentials = errors.New("email atau password salah")
	ErrUserNotFound       = errors.New("user tidak ditemukan")
	ErrInvalidLinkToken   = errors.New("token link tidak valid atau sudah kadaluarsa")
)

type Service struct {
	queries   *Queries
	jwtSecret []byte
	pool      *pgxpool.Pool
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	ID                    string  `json:"id"`
	Email                 string  `json:"email"`
	Name                  string  `json:"name"`
	TelegramID            *int64  `json:"telegram_id,omitempty"`
	Plan                  string  `json:"plan"`
	EarlyAccess           bool    `json:"early_access"`
	SubscriptionExpiresAt *string `json:"subscription_expires_at,omitempty"`
	CreatedAt             string  `json:"created_at"`
}

func NewService(queries *Queries, jwtSecret string, pool *pgxpool.Pool) *Service {
	s := &Service{
		queries:   queries,
		jwtSecret: []byte(jwtSecret),
		pool:      pool,
	}
	// Periodically clean up expired link tokens from DB
	go s.cleanupExpiredTokens()
	return s
}

func (s *Service) cleanupExpiredTokens() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		_, err := s.pool.Exec(context.Background(), "DELETE FROM link_tokens WHERE expires_at < NOW()")
		if err != nil {
			log.Printf("[WARN] Failed to cleanup expired link tokens: %v", err)
		}
	}
}

func (s *Service) GetQueries() *Queries {
	return s.queries
}

func (s *Service) Register(ctx context.Context, email, password, name string) (AuthResponse, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return AuthResponse{}, fmt.Errorf("gagal hash password: %w", err)
	}

	row, err := s.queries.CreateUser(ctx, CreateUserParams{
		Email:        email,
		PasswordHash: string(hashedPassword),
		Name:         name,
	})
	if err != nil {
		if containsDuplicateKey(err) {
			return AuthResponse{}, ErrEmailAlreadyExists
		}
		return AuthResponse{}, fmt.Errorf("gagal buat user: %w", err)
	}

	token, err := s.generateJWT(row.ID, row.Email)
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{
		Token: token,
		User:  toUserResponse(row.ID, row.Email, row.Name, row.TelegramID, row.CreatedAt, row.Plan, row.SubscriptionExpiresAt),
	}, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (AuthResponse, error) {
	row, err := s.queries.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AuthResponse{}, ErrInvalidCredentials
		}
		return AuthResponse{}, fmt.Errorf("gagal query user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(row.PasswordHash), []byte(password)); err != nil {
		return AuthResponse{}, ErrInvalidCredentials
	}

	token, err := s.generateJWT(row.ID, row.Email)
	if err != nil {
		return AuthResponse{}, err
	}

	return AuthResponse{
		Token: token,
		User:  toUserResponse(row.ID, row.Email, row.Name, row.TelegramID, row.CreatedAt, row.Plan, row.SubscriptionExpiresAt),
	}, nil
}

func (s *Service) GetProfile(ctx context.Context, userID pgtype.UUID) (UserResponse, error) {
	row, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return UserResponse{}, ErrUserNotFound
		}
		return UserResponse{}, fmt.Errorf("gagal query user: %w", err)
	}

	return toUserResponse(row.ID, row.Email, row.Name, row.TelegramID, row.CreatedAt, row.Plan, row.SubscriptionExpiresAt), nil
}

func (s *Service) GenerateLinkToken(userID pgtype.UUID) string {
	tokenBytes := make([]byte, 16)
	_, _ = rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)

	expiresAt := time.Now().Add(10 * time.Minute)
	_, err := s.pool.Exec(context.Background(),
		"INSERT INTO link_tokens (token, user_id, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET user_id = $2, expires_at = $3",
		token, userID, expiresAt,
	)
	if err != nil {
		log.Printf("[WARN] Failed to store link token: %v", err)
	}

	return token
}

func (s *Service) RedeemLinkToken(ctx context.Context, token string, telegramID int64) (UserResponse, error) {
	var userID pgtype.UUID
	var expiresAt time.Time
	err := s.pool.QueryRow(ctx,
		"DELETE FROM link_tokens WHERE token = $1 RETURNING user_id, expires_at",
		token,
	).Scan(&userID, &expiresAt)
	if err != nil || time.Now().After(expiresAt) {
		return UserResponse{}, ErrInvalidLinkToken
	}

	row, err := s.queries.LinkTelegram(ctx, LinkTelegramParams{
		ID:         userID,
		TelegramID: pgtype.Int8{Int64: telegramID, Valid: true},
	})
	if err != nil {
		return UserResponse{}, fmt.Errorf("gagal link telegram: %w", err)
	}

	return toUserResponse(row.ID, row.Email, row.Name, row.TelegramID, row.CreatedAt, row.Plan, row.SubscriptionExpiresAt), nil
}

func (s *Service) UpdateProfile(ctx context.Context, userID pgtype.UUID, name, email string) (UserResponse, error) {
	row, err := s.queries.UpdateProfile(ctx, UpdateProfileParams{
		ID:    userID,
		Name:  name,
		Email: email,
	})
	if err != nil {
		if containsDuplicateKey(err) {
			return UserResponse{}, ErrEmailAlreadyExists
		}
		return UserResponse{}, fmt.Errorf("gagal update profil: %w", err)
	}

	return toUserResponse(row.ID, row.Email, row.Name, row.TelegramID, row.CreatedAt, row.Plan, row.SubscriptionExpiresAt), nil
}

func (s *Service) UnlinkTelegram(ctx context.Context, userID pgtype.UUID) (UserResponse, error) {
	row, err := s.queries.UnlinkTelegram(ctx, userID)
	if err != nil {
		return UserResponse{}, fmt.Errorf("gagal unlink telegram: %w", err)
	}

	return toUserResponse(row.ID, row.Email, row.Name, row.TelegramID, row.CreatedAt, row.Plan, row.SubscriptionExpiresAt), nil
}

func (s *Service) ChangePassword(ctx context.Context, userID pgtype.UUID, currentPassword, newPassword string) error {
	// Verify current password
	row, err := s.queries.GetUserByID(ctx, userID)
	if err != nil {
		return ErrUserNotFound
	}

	// GetUserByID doesn't return password_hash, need GetUserByEmail
	fullRow, err := s.queries.GetUserByEmail(ctx, row.Email)
	if err != nil {
		return ErrUserNotFound
	}

	if err := bcrypt.CompareHashAndPassword([]byte(fullRow.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("gagal hash password: %w", err)
	}

	return s.queries.UpdatePassword(ctx, UpdatePasswordParams{
		ID:           userID,
		PasswordHash: string(hashedPassword),
	})
}

func (s *Service) generateJWT(userID pgtype.UUID, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": uuidToString(userID),
		"email":   email,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("gagal generate JWT: %w", err)
	}

	return tokenString, nil
}

func (s *Service) ValidateJWT(tokenString string) (pgtype.UUID, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		return pgtype.UUID{}, "", fmt.Errorf("token tidak valid: %w", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return pgtype.UUID{}, "", errors.New("token claims tidak valid")
	}

	userIDStr, ok := claims["user_id"].(string)
	if !ok {
		return pgtype.UUID{}, "", errors.New("user_id tidak ditemukan di token")
	}

	email, _ := claims["email"].(string)

	uuid, err := stringToUUID(userIDStr)
	return uuid, email, err
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func stringToUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	err := u.Scan(s)
	if err != nil {
		return pgtype.UUID{}, fmt.Errorf("UUID tidak valid: %w", err)
	}
	return u, nil
}

func toUserResponse(id pgtype.UUID, email, name string, telegramID pgtype.Int8, createdAt pgtype.Timestamptz, plan string, subExpires pgtype.Timestamptz) UserResponse {
	resp := UserResponse{
		ID:          uuidToString(id),
		Email:       email,
		Name:        name,
		Plan:        plan,
		EarlyAccess: plangating.IsEarlyAccess(),
		CreatedAt:   createdAt.Time.Format(time.RFC3339),
	}
	if telegramID.Valid {
		resp.TelegramID = &telegramID.Int64
	}
	if subExpires.Valid {
		s := subExpires.Time.Format(time.RFC3339)
		resp.SubscriptionExpiresAt = &s
	}
	return resp
}

func containsDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	errMsg := err.Error()
	for i := 0; i <= len(errMsg)-5; i++ {
		if errMsg[i:i+5] == "23505" {
			return true
		}
	}
	return false
}
