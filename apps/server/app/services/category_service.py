import re
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Category, RecurringRule, UserCategoryPreference
from app.db.schemas import CategoryCreateRequest, CategorySchema, CategoryUpdateRequest


class CategoryService:
    def __init__(self, db: Session):
        self.db = db

    async def get_categories(self, user_id: str) -> list[CategorySchema]:
        """Get system + user's custom categories with preferences in a single query."""
        rows = (
            self.db.query(Category, UserCategoryPreference.is_active)
            .outerjoin(
                UserCategoryPreference,
                (UserCategoryPreference.category_id == Category.id)
                & (UserCategoryPreference.user_id == user_id),
            )
            .filter(
                ((Category.user_id == user_id) & Category.deleted_at.is_(None))
                | Category.user_id.is_(None)
            )
            .order_by(Category.display_order)
            .all()
        )

        result = []
        for cat, pref_active in rows:
            # For system categories, use the user's preference if set, otherwise the default
            # For custom categories, use the category's own is_active flag
            if cat.is_system:
                is_active = pref_active if pref_active is not None else cat.is_active
            else:
                is_active = cat.is_active
            result.append(_to_schema(cat, is_active))

        return result

    async def create_category(self, user_id: str, data: CategoryCreateRequest) -> CategorySchema:
        """Create a custom category (max 20 per user). If a soft-deleted category with the same slug exists, restores it."""
        slug = _generate_slug(data.name)

        existing = (
            self.db.query(Category)
            .filter(Category.user_id == user_id, Category.slug == slug)
            .first()
        )

        if existing:
            if existing.deleted_at is not None:
                # Restore the soft-deleted category with updated fields
                existing.deleted_at = None
                existing.name = data.name
                existing.color_light = data.color_light
                existing.color_dark = data.color_dark
                existing.type = data.type
                existing.alias = data.alias.upper() if data.alias else None
                existing.is_active = True
                self.db.commit()
                self.db.refresh(existing)
                return _to_schema(existing, existing.is_active)
            raise HTTPException(status_code=409, detail="A category with this name already exists")

        live_count = (
            self.db.query(func.count(Category.id))
            .filter(Category.user_id == user_id, Category.deleted_at.is_(None))
            .scalar()
        )
        if live_count >= 20:
            raise HTTPException(status_code=400, detail="Maximum 20 custom categories allowed")

        if data.alias:
            if _check_alias_conflict(self.db, user_id, data.alias.upper()):
                raise HTTPException(
                    status_code=409, detail=f"Alias '{data.alias}' is already in use"
                )

        max_order = (
            self.db.query(func.max(Category.display_order))
            .filter((Category.user_id == user_id) | Category.user_id.is_(None))
            .scalar()
        ) or 0

        category = Category(
            user_id=user_id,
            name=data.name,
            slug=slug,
            color_light=data.color_light,
            color_dark=data.color_dark,
            type=data.type,
            alias=data.alias.upper() if data.alias else None,
            is_system=False,
            is_active=True,
            display_order=max_order + 1,
        )
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        return _to_schema(category, category.is_active)

    async def update_category(
        self, user_id: str, category_id: str, data: CategoryUpdateRequest
    ) -> CategorySchema:
        """Update a custom category (403 on system)."""
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        if category.is_system:
            raise HTTPException(status_code=403, detail="Cannot modify system categories")
        if str(category.user_id) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        if data.name is not None:
            category.name = data.name
            category.slug = _generate_slug(data.name)
        if data.color_light is not None:
            category.color_light = data.color_light
        if data.color_dark is not None:
            category.color_dark = data.color_dark
        if data.type is not None:
            category.type = data.type
        if data.alias is not None:
            alias_upper = data.alias.upper() if data.alias else None
            if alias_upper and _check_alias_conflict(
                self.db, user_id, alias_upper, exclude_id=category_id
            ):
                raise HTTPException(
                    status_code=409, detail=f"Alias '{data.alias}' is already in use"
                )
            category.alias = alias_upper

        self.db.commit()
        self.db.refresh(category)
        return _to_schema(category, category.is_active)

    async def delete_category(self, user_id: str, category_id: str) -> dict:
        """Soft-delete a custom category. Transactions keep their category reference. Recurring rules using this category are paused."""
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        if category.is_system:
            raise HTTPException(status_code=403, detail="Cannot delete system categories")
        if str(category.user_id) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if category.deleted_at is not None:
            raise HTTPException(status_code=409, detail="Category already deleted")

        category.deleted_at = datetime.now(UTC)

        self.db.query(RecurringRule).filter(
            RecurringRule.user_id == user_id,
            RecurringRule.category_id == category_id,
            RecurringRule.is_active.is_(True),
        ).update({RecurringRule.is_active: False})

        self.db.commit()
        return {"success": True, "message": "Category deleted"}

    async def toggle_category(self, user_id: str, category_id: str) -> dict:
        """Toggle active state. System categories go through user preferences; custom categories update directly."""
        category = self.db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        if category.is_system:
            pref = (
                self.db.query(UserCategoryPreference)
                .filter(
                    UserCategoryPreference.user_id == user_id,
                    UserCategoryPreference.category_id == category_id,
                )
                .first()
            )
            if pref:
                pref.is_active = not pref.is_active
                new_state = pref.is_active
            else:
                pref = UserCategoryPreference(
                    user_id=user_id,
                    category_id=category_id,
                    is_active=False,
                )
                self.db.add(pref)
                new_state = False
        else:
            if str(category.user_id) != user_id:
                raise HTTPException(status_code=403, detail="Not authorized")
            category.is_active = not category.is_active
            new_state = category.is_active

        self.db.commit()
        return {"is_active": new_state}


def _generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def _check_alias_conflict(
    db: Session, user_id: str, alias: str, exclude_id: str | None = None
) -> bool:
    query = db.query(Category).filter(
        Category.alias == alias,
        (Category.user_id == user_id) | Category.user_id.is_(None),
    )
    if exclude_id:
        query = query.filter(Category.id != exclude_id)
    return query.first() is not None


def _to_schema(category: Category, is_active: bool) -> CategorySchema:
    return CategorySchema(
        id=str(category.id),
        name=category.name,
        slug=category.slug,
        color_light=category.color_light,
        color_dark=category.color_dark,
        icon=category.icon,
        is_active=is_active,
        is_system=category.is_system,
        display_order=category.display_order,
        type=category.type,
        alias=category.alias,
    )
