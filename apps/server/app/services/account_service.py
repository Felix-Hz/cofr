from sqlalchemy.orm import Session

from app.db.models import Account, User

SYSTEM_ACCOUNT_SPECS = (
    ("Checking", "checking", 0),
    ("Savings", "savings", 1),
    ("Investment", "investment", 2),
)


def ensure_system_accounts(db: Session, user: User) -> list[Account]:
    """Provision default system accounts for a user if none exist."""
    existing_accounts = (
        db.query(Account).filter(Account.user_id == user.id).order_by(Account.display_order).all()
    )
    if existing_accounts:
        if user.default_account_id is None:
            checking = next(
                (a for a in existing_accounts if a.type == "checking"), existing_accounts[0]
            )
            user.default_account_id = checking.id
            db.flush()
        return existing_accounts

    created_accounts: list[Account] = []
    for name, account_type, display_order in SYSTEM_ACCOUNT_SPECS:
        account = Account(
            user_id=user.id,
            name=name,
            type=account_type,
            is_system=True,
            display_order=display_order,
        )
        db.add(account)
        created_accounts.append(account)

    db.flush()
    user.default_account_id = created_accounts[0].id
    db.flush()
    return created_accounts
