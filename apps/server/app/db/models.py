import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy import Uuid as SaUuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import TypeDecorator

from app.crypto import decrypt, encrypt


class EncryptedString(TypeDecorator):
    """Encrypts/decrypts values transparently using Fernet."""

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encrypt(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return decrypt(value)
        return value


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    first_name: Mapped[str] = mapped_column(EncryptedString, default="")
    last_name: Mapped[str] = mapped_column(EncryptedString, default="")
    username: Mapped[str] = mapped_column(EncryptedString, default="")
    preferred_currency: Mapped[str] = mapped_column(String, default="NZD")
    session_timeout_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    default_account_id: Mapped[uuid.UUID | None] = mapped_column(
        SaUuid, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")
    auth_providers: Mapped[list["AuthProvider"]] = relationship(back_populates="user")
    categories: Mapped[list["Category"]] = relationship(back_populates="user")
    default_account: Mapped["Account | None"] = relationship(
        foreign_keys=[default_account_id], back_populates="default_for_users"
    )
    accounts: Mapped[list["Account"]] = relationship(
        back_populates="user", foreign_keys="Account.user_id"
    )


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (UniqueConstraint("user_id", "slug", name="uq_category_user_slug"),)

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        SaUuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(60))
    slug: Mapped[str] = mapped_column(String(60))
    color_light: Mapped[str] = mapped_column(String(7))
    color_dark: Mapped[str] = mapped_column(String(7))
    icon: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[str] = mapped_column(String(10), default="expense")
    alias: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User | None"] = relationship(back_populates="categories")
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="category_rel")


class UserCategoryPreference(Base):
    __tablename__ = "user_category_preferences"

    user_id: Mapped[uuid.UUID] = mapped_column(
        SaUuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        SaUuid, ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_account_user_name"),)

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        SaUuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(60))
    type: Mapped[str] = mapped_column(String(20))
    is_system: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"))
    display_order: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="accounts", foreign_keys=[user_id])
    default_for_users: Mapped[list["User"]] = relationship(
        back_populates="default_account", foreign_keys="User.default_account_id"
    )
    transactions: Mapped[list["Transaction"]] = relationship(back_populates="account_rel")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(SaUuid, ForeignKey("users.id"), index=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        SaUuid, ForeignKey("categories.id"), index=True, nullable=True
    )
    account_id: Mapped[uuid.UUID] = mapped_column(SaUuid, ForeignKey("accounts.id"), index=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String, default="NZD", index=True)
    notes: Mapped[str] = mapped_column(String, default="")
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )  # user-controlled: when the transaction happened
    inserted_at: Mapped[datetime] = (
        mapped_column(  # system-controlled: when the row was created (sort tiebreaker)
            DateTime(timezone=True), server_default=func.now(), nullable=False
        )
    )
    hash: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)
    is_opening_balance: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    linked_transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        SaUuid, ForeignKey("transactions.id", ondelete="SET NULL"), index=True, nullable=True
    )
    is_transfer: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"))
    transfer_direction: Mapped[str | None] = mapped_column(String(4), nullable=True)

    user: Mapped["User"] = relationship(back_populates="transactions")
    category_rel: Mapped["Category | None"] = relationship(back_populates="transactions")
    account_rel: Mapped["Account"] = relationship(back_populates="transactions")


class AuthProvider(Base):
    __tablename__ = "auth_providers"
    __table_args__ = (UniqueConstraint("provider", "provider_user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(SaUuid, ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String, index=True)
    provider_user_id: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    display_name: Mapped[str | None] = mapped_column(EncryptedString, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)

    user: Mapped["User"] = relationship(back_populates="auth_providers")


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"

    currency_code: Mapped[str] = mapped_column(String, primary_key=True)
    rate_to_usd: Mapped[float] = mapped_column(Float, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class EmailEvent(Base):
    __tablename__ = "email_events"

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    email_hash: Mapped[str] = mapped_column(String, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    provider_message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Export(Base):
    __tablename__ = "exports"

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        SaUuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    format: Mapped[str] = mapped_column(String(10))
    scope: Mapped[str] = mapped_column(String(20))
    file_size: Mapped[int] = mapped_column(Integer)
    s3_key: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EmailSuppression(Base):
    __tablename__ = "email_suppressions"

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    email_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
