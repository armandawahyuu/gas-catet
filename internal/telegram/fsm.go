package telegram

import (
	"sync"
	"time"
)

// FSM States
const (
	StateIdle              = 0
	StateWaitingCategory   = 1
	StateWaitingForName    = 2
	StateWaitingAmount     = 3
	StateWaitingDate       = 4
	StateWaitingCustomDate = 5
	StateWaitingWallet     = 6
	StateWaitingConfirm    = 7
	StateReceiptConfirm    = 8
	StateReceiptWallet     = 9
)

// Transaction type constants
const (
	TypeExpense = "EXPENSE"
	TypeIncome  = "INCOME"
)

type UserSession struct {
	State           int
	TransactionType string
	Category        string
	Description     string
	Amount          int64
	WalletID        string
	WalletName      string
	TxDate          string
	ReceiptFileID   string // Telegram photo file_id for receipt
	UpdatedAt       time.Time
}

type FSM struct {
	mu       sync.RWMutex
	sessions map[int64]*UserSession
}

func NewFSM() *FSM {
	f := &FSM{
		sessions: make(map[int64]*UserSession),
	}
	// Periodically clean expired sessions to prevent memory leaks
	go f.cleanupExpiredSessions()
	return f
}

func (f *FSM) cleanupExpiredSessions() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		f.mu.Lock()
		now := time.Now()
		for chatID, session := range f.sessions {
			if now.Sub(session.UpdatedAt) > 15*time.Minute {
				delete(f.sessions, chatID)
			}
		}
		f.mu.Unlock()
	}
}

func (f *FSM) GetSession(chatID int64) *UserSession {
	f.mu.RLock()
	defer f.mu.RUnlock()

	session, exists := f.sessions[chatID]
	if !exists {
		return &UserSession{State: StateIdle}
	}

	// Auto-expire sessions after 15 minutes of inactivity
	if time.Since(session.UpdatedAt) > 15*time.Minute {
		return &UserSession{State: StateIdle}
	}

	return session
}

func (f *FSM) SetSession(chatID int64, session *UserSession) {
	f.mu.Lock()
	defer f.mu.Unlock()

	session.UpdatedAt = time.Now()
	f.sessions[chatID] = session
}

func (f *FSM) ResetSession(chatID int64) {
	f.mu.Lock()
	defer f.mu.Unlock()

	delete(f.sessions, chatID)
}
