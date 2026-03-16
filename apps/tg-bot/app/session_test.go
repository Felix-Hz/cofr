package app

import (
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
)

// newTestSessionManager creates a session manager without the cleanup goroutine.
func newTestSessionManager() *SessionManager {
	return &SessionManager{
		sessions: make(map[int64]*FlowSession),
	}
}

func TestSessionManager_SetAndGet(t *testing.T) {
	sm := newTestSessionManager()
	session := &FlowSession{Flow: FlowAdd, Step: StepEnterAmount}

	sm.Set(123, session)
	got := sm.Get(123)

	if got == nil {
		t.Fatal("expected session, got nil")
	}
	if got.Flow != FlowAdd {
		t.Errorf("expected FlowAdd, got %v", got.Flow)
	}
	if got.Step != StepEnterAmount {
		t.Errorf("expected StepEnterAmount, got %v", got.Step)
	}
}

func TestSessionManager_GetReturnsNilWhenEmpty(t *testing.T) {
	sm := newTestSessionManager()

	got := sm.Get(999)
	if got != nil {
		t.Error("expected nil for unknown chat ID")
	}
}

func TestSessionManager_DeleteRemovesSession(t *testing.T) {
	sm := newTestSessionManager()
	sm.Set(123, &FlowSession{Flow: FlowAdd})

	sm.Delete(123)
	got := sm.Get(123)

	if got != nil {
		t.Error("expected nil after delete")
	}
}

func TestSessionManager_GetReturnsNilForExpiredSession(t *testing.T) {
	sm := newTestSessionManager()
	session := &FlowSession{Flow: FlowAdd}

	sm.Set(123, session)
	// Manually backdate the CreatedAt to simulate expiry
	sm.mu.Lock()
	sm.sessions[123].CreatedAt = time.Now().Add(-10 * time.Minute)
	sm.mu.Unlock()

	got := sm.Get(123)
	if got != nil {
		t.Error("expected nil for expired session")
	}
}

func TestSessionManager_SetInitializesIDMap(t *testing.T) {
	sm := newTestSessionManager()
	session := &FlowSession{Flow: FlowAdd, IDMap: nil}

	sm.Set(123, session)
	got := sm.Get(123)

	if got.IDMap == nil {
		t.Error("expected IDMap to be initialized")
	}
}

func TestSessionManager_SetOverwritesExisting(t *testing.T) {
	sm := newTestSessionManager()
	sm.Set(123, &FlowSession{Flow: FlowAdd, UserID: uuid.MustParse("11111111-1111-1111-1111-111111111111")})
	sm.Set(123, &FlowSession{Flow: FlowEdit, UserID: uuid.MustParse("22222222-2222-2222-2222-222222222222")})

	got := sm.Get(123)
	if got.Flow != FlowEdit {
		t.Errorf("expected FlowEdit, got %v", got.Flow)
	}
	if got.UserID != uuid.MustParse("22222222-2222-2222-2222-222222222222") {
		t.Error("expected second session's UserID")
	}
}

func TestSessionManager_ConcurrentAccess(t *testing.T) {
	sm := newTestSessionManager()
	var wg sync.WaitGroup

	for i := 0; i < 100; i++ {
		wg.Add(3)
		chatID := int64(i)

		go func() {
			defer wg.Done()
			sm.Set(chatID, &FlowSession{Flow: FlowAdd})
		}()
		go func() {
			defer wg.Done()
			sm.Get(chatID)
		}()
		go func() {
			defer wg.Done()
			sm.Delete(chatID)
		}()
	}

	wg.Wait()
	// If we reach here without panic, the test passes
}

func TestSessionManager_SetStampsCreatedAt(t *testing.T) {
	sm := newTestSessionManager()
	before := time.Now()
	sm.Set(123, &FlowSession{Flow: FlowAdd})
	after := time.Now()

	got := sm.Get(123)
	if got.CreatedAt.Before(before) || got.CreatedAt.After(after) {
		t.Errorf("CreatedAt %v not between %v and %v", got.CreatedAt, before, after)
	}
}
