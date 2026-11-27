import json
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import Base, engine, get_session
from app.models import AnalysisJob, Match, Player, Rally, Shot, User
from app.runner import run_analysis
from app.settings import settings


class SessionIn(BaseModel):
    name: str
    email: str
    role: str


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Path(settings.data_dir, "videos").mkdir(parents=True, exist_ok=True)
    Path(settings.data_dir, "jobs").mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Fondocampo", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def current_user(authorization: str = Header(default=""), db: Session = Depends(get_session)) -> User:
    token = authorization.removeprefix("Bearer ").strip()
    user = db.query(User).filter(User.token == token).one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="Sessione mancante")
    return user


def enqueue(match_id: str, job_id: str) -> None:
    if settings.inline_jobs:
        run_analysis(match_id, job_id)
        return
    from redis import Redis
    from rq import Queue

    Queue("analysis", connection=Redis.from_url(settings.redis_url)).enqueue("app.tasks.analyze_match", match_id, job_id)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "fondocampo"}


@app.post("/v1/session")
def session(body: SessionIn, db: Session = Depends(get_session)) -> dict:
    user = db.query(User).filter(User.email == body.email).one_or_none()
    if user is None:
        user = User(id=secrets.token_hex(8), email=body.email, ruolo=body.role, nome=body.name, token=secrets.token_hex(16))
        db.add(user)
    else:
        user.nome = body.name
        user.ruolo = body.role
    db.commit()
    return {"token": user.token, "user": {"id": user.id, "name": user.nome, "email": user.email, "role": user.ruolo}}


@app.post("/v1/players")
def create_player(body: dict, user: User = Depends(current_user), db: Session = Depends(get_session)) -> dict:
    player_id = str(body.get("id") or secrets.token_hex(6))
    payload = {**body, "id": player_id, "ownerId": user.id, "example": False}
    row = db.get(Player, player_id)
    if row is None:
        row = Player(
            id=player_id,
            nome=payload.get("name", ""),
            sport=payload.get("sport", "padel"),
            lato_preferito=payload.get("side"),
            mano=payload.get("hand", "right"),
            owner_id=user.id,
            payload=json.dumps(payload),
        )
        db.add(row)
    else:
        row.nome = payload.get("name", row.nome)
        row.payload = json.dumps(payload)
    db.commit()
    return payload


@app.post("/v1/matches")
def create_match(body: dict, user: User = Depends(current_user), db: Session = Depends(get_session)) -> dict:
    match_id = str(body.get("id") or secrets.token_hex(6))
    payload = {**body, "id": match_id, "ownerId": user.id, "example": False, "source": "local_api", "status": "draft"}
    row = Match(
        id=match_id,
        sport=payload.get("sport", "padel"),
        data=payload.get("date", ""),
        luogo=payload.get("place", ""),
        formato=payload.get("format", ""),
        video_url="",
        stato_analisi="draft",
        owner_id=user.id,
        payload=json.dumps(payload),
    )
    db.merge(row)
    db.commit()
    return payload


@app.post("/v1/matches/{match_id}/video")
async def upload_video(
    match_id: str,
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: Session = Depends(get_session),
) -> dict:
    match = db.get(Match, match_id)
    if match is None or match.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    destination = Path(settings.data_dir) / "videos" / f"{match_id}.mp4"
    destination.write_bytes(await file.read())
    match.video_url = str(destination)
    if settings.s3_enabled:
        _try_s3(destination, f"{match_id}.mp4")
    db.commit()
    return {"ok": True, "videoUrl": match.video_url}


@app.post("/v1/matches/{match_id}/analyze")
def analyze(match_id: str, user: User = Depends(current_user), db: Session = Depends(get_session)) -> dict:
    match = db.get(Match, match_id)
    if match is None or match.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    job_id = secrets.token_hex(8)
    job = AnalysisJob(id=job_id, match_id=match_id, stato="queued", progresso=0, log=json.dumps(["In coda."]), errore="")
    db.add(job)
    match.stato_analisi = "processing"
    db.commit()
    enqueue(match_id, job_id)
    return {"jobId": job_id}


@app.get("/v1/jobs/{job_id}")
def read_job(job_id: str, user: User = Depends(current_user), db: Session = Depends(get_session)) -> dict:
    job = db.get(AnalysisJob, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    match = db.get(Match, job.match_id)
    if match is None or match.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Lavoro non trovato")
    return {"status": job.stato, "progress": job.progresso, "log": json.loads(job.log or "[]"), "error": job.errore}


@app.get("/v1/matches/{match_id}/report")
def report(match_id: str, user: User = Depends(current_user), db: Session = Depends(get_session)) -> dict:
    match = db.get(Match, match_id)
    if match is None or match.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Partita non trovata")
    shots = [json.loads(row.payload) for row in db.query(Shot).filter(Shot.match_id == match_id)]
    rallies = [json.loads(row.payload) for row in db.query(Rally).filter(Rally.match_id == match_id)]
    players = [json.loads(row.payload) for row in db.query(Player).filter(Player.owner_id == user.id)]
    return {"match": json.loads(match.payload), "shots": shots, "rallies": rallies, "players": players}


@app.patch("/v1/shots/{shot_id}")
def patch_shot(shot_id: str, body: dict, user: User = Depends(current_user), db: Session = Depends(get_session)) -> dict:
    row = db.get(Shot, shot_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Colpo non trovato")
    match = db.get(Match, row.match_id)
    if match is None or match.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Colpo non trovato")
    payload = json.loads(row.payload)
    payload.update(body)
    payload["manuallyCorrected"] = True
    payload["confidence"] = 1
    row.payload = json.dumps(payload)
    row.tipo_colpo = payload.get("type", row.tipo_colpo)
    row.esito = payload.get("outcome", row.esito)
    row.motivo_errore = payload.get("errorReason") or ""
    row.corretto_manualmente = 1
    row.confidenza = 1
    db.commit()
    return payload


def _try_s3(path: Path, key: str) -> None:
    try:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
        )
        try:
            client.create_bucket(Bucket=settings.s3_bucket)
        except Exception:
            pass
        client.upload_file(str(path), settings.s3_bucket, key)
    except Exception:
        return
