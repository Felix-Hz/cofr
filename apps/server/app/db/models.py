import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
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
    link_code: Mapped[str | None] = mapped_column(String, nullable=True)
    link_code_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")
    auth_providers: Mapped[list["AuthProvider"]] = relationship(back_populates="user")
    categories: Mapped[list["Category"]] = relationship(back_populates="user")


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
    is_system: Mapped[bool] = mapped_column(Boolean, default=True)
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


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(SaUuid, ForeignKey("users.id"), index=True)
    category_id: Mapped[uuid.UUID] = mapped_column(SaUuid, ForeignKey("categories.id"), index=True)
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

    user: Mapped["User"] = relationship(back_populates="transactions")
    category_rel: Mapped["Category"] = relationship(back_populates="transactions")


class Offset(Base):
    __tablename__ = "offsets"

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    offset: Mapped[int] = mapped_column(Integer, default=0)


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
