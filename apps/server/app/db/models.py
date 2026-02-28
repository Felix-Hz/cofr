import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
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
    user_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True, nullable=True)
    first_name: Mapped[str] = mapped_column(EncryptedString, default="")
    last_name: Mapped[str] = mapped_column(EncryptedString, default="")
    username: Mapped[str] = mapped_column(EncryptedString, default="")
    preferred_currency: Mapped[str] = mapped_column(String, default="NZD")

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="user")
    auth_providers: Mapped[list["AuthProvider"]] = relationship(back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(SaUuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(SaUuid, ForeignKey("users.id"), index=True)
    category: Mapped[str] = mapped_column(String, index=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String, default="NZD", index=True)
    notes: Mapped[str] = mapped_column(String, default="")
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    hash: Mapped[str | None] = mapped_column(String, unique=True, index=True, nullable=True)

    user: Mapped["User"] = relationship(back_populates="transactions")


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

    user: Mapped["User"] = relationship(back_populates="auth_providers")
