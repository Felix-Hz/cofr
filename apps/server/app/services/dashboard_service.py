from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.db.models import DashboardSpace, DashboardWidget
from app.db.schemas import (
    DashboardLayoutResponse,
    DashboardLayoutUpdate,
    DashboardSpaceSchema,
    DashboardWidgetSchema,
)

# Keep this allow-list aligned with the client `WIDGET_TYPES`, `WIDGET_META`,
# and `WIDGET_ORDER` definitions.
ALLOWED_WIDGET_TYPES: frozenset[str] = frozenset(
    {
        "stat_income",
        "stat_spent",
        "stat_net",
        "stat_savings_rate",
        "period_stats_4up",
        "category_pie",
        "account_balances",
        "transactions",
        "net_worth",
        "savings_investment",
        "spend_sparkline",
        "top_categories_bars",
        "income_spend_compare",
        "avg_daily_spend",
        "monthly_trend_bars",
        "weekday_heatmap",
        "account_trend",
        "recurring_subscriptions",
        "upcoming_recurring",
    }
)

DEFAULT_LAYOUT: list[dict] = [
    {"widget_type": "period_stats_4up", "col_x": 0, "col_y": 0, "col_span": 12, "row_span": 1},
    {"widget_type": "net_worth", "col_x": 0, "col_y": 1, "col_span": 4, "row_span": 2},
    {"widget_type": "savings_investment", "col_x": 4, "col_y": 1, "col_span": 4, "row_span": 2},
    {"widget_type": "account_balances", "col_x": 8, "col_y": 1, "col_span": 4, "row_span": 2},
    {"widget_type": "category_pie", "col_x": 0, "col_y": 3, "col_span": 6, "row_span": 3},
    {"widget_type": "spend_sparkline", "col_x": 6, "col_y": 3, "col_span": 6, "row_span": 3},
    {"widget_type": "transactions", "col_x": 0, "col_y": 6, "col_span": 12, "row_span": 4},
]


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def ensure_default_layout(self, user_id: str) -> list[DashboardSpace]:
        """Lazy-create a default space + widgets if the user has none."""
        spaces = (
            self.db.query(DashboardSpace)
            .options(selectinload(DashboardSpace.widgets))
            .filter(DashboardSpace.user_id == user_id)
            .order_by(DashboardSpace.position)
            .all()
        )
        if spaces:
            return spaces

        space = DashboardSpace(
            user_id=user_id,
            name="Overview",
            position=0,
            is_default=True,
        )
        self.db.add(space)
        self.db.flush()

        for spec in DEFAULT_LAYOUT:
            self.db.add(
                DashboardWidget(
                    space_id=space.id,
                    widget_type=spec["widget_type"],
                    col_x=spec["col_x"],
                    col_y=spec["col_y"],
                    col_span=spec["col_span"],
                    row_span=spec["row_span"],
                )
            )
        self.db.commit()

        return (
            self.db.query(DashboardSpace)
            .options(selectinload(DashboardSpace.widgets))
            .filter(DashboardSpace.user_id == user_id)
            .order_by(DashboardSpace.position)
            .all()
        )

    def get_layout(self, user_id: str) -> DashboardLayoutResponse:
        spaces = self.ensure_default_layout(user_id)
        return DashboardLayoutResponse(spaces=[self._space_to_schema(s) for s in spaces])

    def replace_layout(
        self, user_id: str, payload: DashboardLayoutUpdate
    ) -> DashboardLayoutResponse:
        """Replace the user's entire dashboard layout in a single transaction."""
        for space in payload.spaces:
            for widget in space.widgets:
                if widget.widget_type not in ALLOWED_WIDGET_TYPES:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Unknown widget type: {widget.widget_type}",
                    )
                if widget.col_x + widget.col_span > 12:
                    raise HTTPException(
                        status_code=422,
                        detail=f"Widget {widget.widget_type} overflows 12-column grid",
                    )

        # Enforce unique space names per user within the request
        names = [s.name for s in payload.spaces]
        if len(names) != len(set(names)):
            raise HTTPException(status_code=422, detail="Space names must be unique")

        # Ensure exactly one default space
        defaults = [s for s in payload.spaces if s.is_default]
        if len(defaults) != 1:
            raise HTTPException(
                status_code=422, detail="Exactly one space must be marked as default"
            )

        existing = self.db.query(DashboardSpace).filter(DashboardSpace.user_id == user_id).all()
        for s in existing:
            self.db.delete(s)
        self.db.flush()

        for space_input in payload.spaces:
            space = DashboardSpace(
                user_id=user_id,
                name=space_input.name,
                position=space_input.position,
                is_default=space_input.is_default,
            )
            self.db.add(space)
            self.db.flush()
            for w in space_input.widgets:
                self.db.add(
                    DashboardWidget(
                        space_id=space.id,
                        widget_type=w.widget_type,
                        col_x=w.col_x,
                        col_y=w.col_y,
                        col_span=w.col_span,
                        row_span=w.row_span,
                        config=w.config,
                    )
                )

        self.db.commit()
        return self.get_layout(user_id)

    @staticmethod
    def _space_to_schema(space: DashboardSpace) -> DashboardSpaceSchema:
        return DashboardSpaceSchema(
            id=str(space.id),
            name=space.name,
            position=space.position,
            is_default=space.is_default,
            widgets=[
                DashboardWidgetSchema(
                    id=str(w.id),
                    widget_type=w.widget_type,
                    col_x=w.col_x,
                    col_y=w.col_y,
                    col_span=w.col_span,
                    row_span=w.row_span,
                    config=w.config,
                )
                for w in sorted(space.widgets, key=lambda x: (x.col_y, x.col_x))
            ],
        )
