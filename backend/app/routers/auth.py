from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import create_access_token, get_current_user, hash_password, normalize_username, verify_password
from app.db import get_db
from app.models import User
from app.schemas import AuthCredentials, AuthResponse, UserRead

router = APIRouter(tags=["auth"])


def _build_auth_response(user: User) -> AuthResponse:
    return AuthResponse(access_token=create_access_token(user), user=UserRead.model_validate(user))


@router.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: AuthCredentials, db: Session = Depends(get_db)) -> AuthResponse:
    username = normalize_username(payload.username)
    existing_user = db.scalar(select(User).where(User.username == username))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Esse nome de usuário já está em uso.")

    user = User(username=username, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_auth_response(user)


@router.post("/auth/login", response_model=AuthResponse)
def login(payload: AuthCredentials, db: Session = Depends(get_db)) -> AuthResponse:
    username = normalize_username(payload.username)
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário ou senha inválidos.")

    return _build_auth_response(user)


@router.get("/auth/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
