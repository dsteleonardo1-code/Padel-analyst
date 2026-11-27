from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String)
    ruolo: Mapped[str] = mapped_column(String)
    nome: Mapped[str] = mapped_column(String)
    token: Mapped[str] = mapped_column(String, unique=True)


class Player(Base):
    __tablename__ = "player"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    nome: Mapped[str] = mapped_column(String)
    sport: Mapped[str] = mapped_column(String)
    lato_preferito: Mapped[str | None] = mapped_column(String, nullable=True)
    mano: Mapped[str] = mapped_column(String)
    owner_id: Mapped[str] = mapped_column(String)
    payload: Mapped[str] = mapped_column(Text)


class Match(Base):
    __tablename__ = "match"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    sport: Mapped[str] = mapped_column(String)
    data: Mapped[str] = mapped_column(String, default="")
    luogo: Mapped[str] = mapped_column(String, default="")
    formato: Mapped[str] = mapped_column(String, default="")
    video_url: Mapped[str] = mapped_column(String, default="")
    stato_analisi: Mapped[str] = mapped_column(String, default="draft")
    owner_id: Mapped[str] = mapped_column(String)
    payload: Mapped[str] = mapped_column(Text)


class Rally(Base):
    __tablename__ = "rally"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    match_id: Mapped[str] = mapped_column(String, index=True)
    numero: Mapped[int]
    t_inizio: Mapped[float]
    t_fine: Mapped[float]
    vincitore_squadra: Mapped[str] = mapped_column(String, default="")
    payload: Mapped[str] = mapped_column(Text)


class Shot(Base):
    __tablename__ = "shot"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    rally_id: Mapped[str] = mapped_column(String, index=True)
    match_id: Mapped[str] = mapped_column(String, index=True)
    player_id: Mapped[str] = mapped_column(String)
    t_impatto: Mapped[float]
    tipo_colpo: Mapped[str] = mapped_column(String)
    lato_corpo: Mapped[str] = mapped_column(String, default="")
    pos_impatto_x: Mapped[float] = mapped_column(default=0)
    pos_impatto_y: Mapped[float] = mapped_column(default=0)
    pos_atterraggio_x: Mapped[float] = mapped_column(default=0)
    pos_atterraggio_y: Mapped[float] = mapped_column(default=0)
    altezza_impatto: Mapped[float] = mapped_column(default=0)
    esito: Mapped[str] = mapped_column(String, default="unclassified")
    motivo_errore: Mapped[str] = mapped_column(String, default="")
    confidenza: Mapped[float] = mapped_column(default=0)
    corretto_manualmente: Mapped[int] = mapped_column(default=0)
    payload: Mapped[str] = mapped_column(Text)


class AnalysisJob(Base):
    __tablename__ = "analysis_job"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    match_id: Mapped[str] = mapped_column(String, index=True)
    stato: Mapped[str] = mapped_column(String, default="queued")
    progresso: Mapped[int] = mapped_column(default=0)
    log: Mapped[str] = mapped_column(Text, default="[]")
    errore: Mapped[str] = mapped_column(Text, default="")
