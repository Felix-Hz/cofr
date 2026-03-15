package app

import (
	"sync"
	"time"

	"github.com/google/uuid"
)

// FlowType represents the type of guided flow.
type FlowType string

const (
	FlowAdd  FlowType = "add"
	FlowEdit FlowType = "edit"
)

// FlowStep represents the current step in a guided flow.
type FlowStep string

const (
	StepSelectCategory FlowStep = "select_category"
	StepEnterAmount    FlowStep = "enter_amount"
	StepConfirm        FlowStep = "confirm"
	StepEnterNotes     FlowStep = "enter_notes"
	StepSelectCurrency FlowStep = "select_currency"
	// Edit flow steps
	StepSelectTransaction FlowStep = "select_transaction"
	StepEditField         FlowStep = "edit_field"
	StepEditAmount        FlowStep = "edit_amount"
	StepEditCategory      FlowStep = "edit_category"
	StepEditCurrency      FlowStep = "edit_currency"
	StepEditNotes         FlowStep = "edit_notes"
)

// FlowSession stores the state of an active multi-step flow.
type FlowSession struct {
	Flow          FlowType
	Step          FlowStep
	UserID        uuid.UUID
	CategoryID    uuid.UUID
	CategoryName  string
	CategoryIcon  string
	Amount        float64
	Currency      string
	Notes         string
	MessageID     int // The bot message being edited in-place
	TransactionID uuid.UUID
	ReceiptFileID string
	CreatedAt     time.Time
	// Short ID mapping for callback data (UUID is too long for 64-byte callback limit)
	IDMap map[string]uuid.UUID
}

const sessionTTL = 5 * time.Minute

// SessionManager manages in-memory flow sessions keyed by chat ID.
type SessionManager struct {
	sessions map[int64]*FlowSession
	mu       sync.RWMutex
}

// NewSessionManager creates a new session manager and starts the cleanup goroutine.
func NewSessionManager() *SessionManager {
	sm := &SessionManager{
		sessions: make(map[int64]*FlowSession),
	}
	go sm.cleanupLoop()
	return sm
}

// Get returns the active session for a chat, or nil if none exists.
func (sm *SessionManager) Get(chatID int64) *FlowSession {
	sm.mu.RLock()
	defer sm.mu.RUnlock()
	s, ok := sm.sessions[chatID]
	if !ok {
		return nil
	}
	if time.Since(s.CreatedAt) > sessionTTL {
		return nil
	}
	return s
}

// Set creates or replaces a session for a chat.
func (sm *SessionManager) Set(chatID int64, session *FlowSession) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	session.CreatedAt = time.Now()
	if session.IDMap == nil {
		session.IDMap = make(map[string]uuid.UUID)
	}
	sm.sessions[chatID] = session
}

// Delete removes a session for a chat.
func (sm *SessionManager) Delete(chatID int64) {
	sm.mu.Lock()
	defer sm.mu.Unlock()
	delete(sm.sessions, chatID)
}

// cleanupLoop periodically removes expired sessions.
func (sm *SessionManager) cleanupLoop() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		sm.mu.Lock()
		for chatID, s := range sm.sessions {
			if time.Since(s.CreatedAt) > sessionTTL {
				delete(sm.sessions, chatID)
			}
		}
		sm.mu.Unlock()
	}
}

// Sessions is the global session manager instance.
var Sessions *SessionManager
