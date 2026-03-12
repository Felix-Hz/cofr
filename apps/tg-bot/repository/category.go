package repository

import (
	"sync"
	"time"

	. "remind0/db"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type categoryRepository struct {
	dbClient *gorm.DB
	cache    map[uuid.UUID]cachedCategories
	mu       sync.RWMutex
}

type cachedCategories struct {
	categories []Category
	fetchedAt  time.Time
}

const cacheTTL = 5 * time.Minute

type ICategoryRepository interface {
	// GetForUser returns system + user's custom categories, respecting active preferences.
	GetForUser(userID uuid.UUID) ([]Category, error)
	// FindByAlias finds a category by alias for a given user (system + custom).
	FindByAlias(userID uuid.UUID, alias string) (*Category, error)
	// InvalidateCache removes cached categories for a user.
	InvalidateCache(userID uuid.UUID)
}

func CategoryRepositoryImpl(dbClient *gorm.DB) ICategoryRepository {
	return &categoryRepository{
		dbClient: dbClient,
		cache:    make(map[uuid.UUID]cachedCategories),
	}
}

func (r *categoryRepository) GetForUser(userID uuid.UUID) ([]Category, error) {
	// Check cache first
	r.mu.RLock()
	if cached, ok := r.cache[userID]; ok && time.Since(cached.fetchedAt) < cacheTTL {
		r.mu.RUnlock()
		return cached.categories, nil
	}
	r.mu.RUnlock()

	// Fetch from DB: system categories + user's custom categories
	var categories []Category
	err := r.dbClient.
		Where("(user_id IS NULL OR user_id = ?)", userID).
		Order("display_order ASC, name ASC").
		Find(&categories).Error
	if err != nil {
		return nil, err
	}

	// Apply user preferences for system categories
	var prefs []UserCategoryPreference
	r.dbClient.Where("user_id = ?", userID).Find(&prefs)

	prefMap := make(map[uuid.UUID]bool)
	for _, p := range prefs {
		prefMap[p.CategoryID] = p.IsActive
	}

	// Filter: for system categories, check user_category_preferences; for custom, check is_active directly
	var active []Category
	for _, cat := range categories {
		if cat.IsSystem {
			if pref, hasPref := prefMap[cat.ID]; hasPref {
				if pref {
					active = append(active, cat)
				}
			} else if cat.IsActive {
				// No preference override — use default
				active = append(active, cat)
			}
		} else if cat.IsActive {
			active = append(active, cat)
		}
	}

	// Update cache
	r.mu.Lock()
	r.cache[userID] = cachedCategories{categories: active, fetchedAt: time.Now()}
	r.mu.Unlock()

	return active, nil
}

func (r *categoryRepository) FindByAlias(userID uuid.UUID, alias string) (*Category, error) {
	categories, err := r.GetForUser(userID)
	if err != nil {
		return nil, err
	}

	for i := range categories {
		if categories[i].Alias != nil && *categories[i].Alias == alias {
			return &categories[i], nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

func (r *categoryRepository) InvalidateCache(userID uuid.UUID) {
	r.mu.Lock()
	delete(r.cache, userID)
	r.mu.Unlock()
}
