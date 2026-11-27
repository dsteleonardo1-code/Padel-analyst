import json
from pathlib import Path

from app.db import SessionLocal
from app.models import AnalysisJob, Match, Rally, Shot
from app.pipeline.run import analyze_frames, read_video
from app.settings import settings


def run_analysis(match_id: str, job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(AnalysisJob, job_id)
        match = db.get(Match, match_id)
        if job is None or match is None:
            return

        def log(progress: int, line: str) -> None:
            lines = json.loads(job.log or "[]")
            lines.append(line)
            job.log = json.dumps(lines)
            job.progresso = progress
            job.stato = "processing"
            db.commit()

        video = Path(settings.data_dir) / "videos" / f"{match_id}.mp4"
        if not video.exists():
            job.stato = "error"
            job.errore = "Video mancante sul disco locale."
            db.commit()
            return
        log(15, "Leggo il video.")
        frames, fps = read_video(str(video))
        payload = json.loads(match.payload)
        log(40, f"Fotogrammi letti: {len(frames)}.")
        result = analyze_frames(
            frames,
            payload.get("sport", "padel"),
            Path(settings.data_dir) / "jobs" / job_id,
            source_fps=fps or 25,
        )
        db.query(Shot).filter(Shot.match_id == match_id).delete()
        db.query(Rally).filter(Rally.match_id == match_id).delete()
        focus = payload.get("focusPlayerId", "")
        for rally in result["rallies"]:
            rally["matchId"] = match_id
            db.add(Rally(
                id=f"{match_id}-{rally['id']}",
                match_id=match_id,
                numero=rally["number"],
                t_inizio=rally["tStart"],
                t_fine=rally["tEnd"],
                vincitore_squadra="" if rally.get("winnerTeam") is None else str(rally["winnerTeam"]),
                payload=json.dumps({**rally, "id": f"{match_id}-{rally['id']}"}),
            ))
        for shot in result["shots"]:
            shot["matchId"] = match_id
            shot["playerId"] = focus
            shot["id"] = f"{match_id}-{shot['id']}"
            shot["rallyId"] = f"{match_id}-{shot['rallyId']}"
            db.add(Shot(
                id=shot["id"],
                rally_id=shot["rallyId"],
                match_id=match_id,
                player_id=focus,
                t_impatto=shot["tImpact"],
                tipo_colpo=shot["type"],
                lato_corpo=shot.get("bodySide") or "",
                pos_impatto_x=shot["impactX"],
                pos_impatto_y=shot["impactY"],
                pos_atterraggio_x=shot["landX"],
                pos_atterraggio_y=shot["landY"],
                altezza_impatto=shot["impactHeight"],
                esito=shot["outcome"],
                motivo_errore=shot.get("errorReason") or "",
                confidenza=shot["confidence"],
                corretto_manualmente=0,
                payload=json.dumps(shot),
            ))
        payload.update({
            "status": "ready",
            "source": "local_api",
            "example": False,
            "durationSec": result["duration"],
            "unclassifiedSegments": result["unclassified_segments"],
            "observation": result["observation"],
            "confidenceNote": "Stima della pipeline locale con OpenCV. Non è un modello addestrato: gli esiti restano non classificati se il rimbalzo non è misurato.",
            "limitNote": "Analisi euristica in locale. La confidenza è una stima.",
        })
        match.payload = json.dumps(payload)
        match.stato_analisi = "ready"
        log(100, "Report pronto. Gli esiti non misurati restano non classificati.")
        job.stato = "ready"
        job.progresso = 100
        db.commit()
    except Exception as exc:  # noqa: BLE001 — surface the pipeline error on the job
        db.rollback()
        job = db.get(AnalysisJob, job_id)
        if job is not None:
            job.stato = "error"
            job.errore = str(exc)
            db.commit()
    finally:
        db.close()
