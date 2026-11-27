from pathlib import Path

import cv2

from app.pipeline.ball import find_impacts, interpolate
from app.pipeline.classify import HeuristicShotClassifier
from app.pipeline.court import find_court_quad, homography_from_quad, image_to_court
from app.pipeline.detect import ball_candidates, motion_boxes
from app.pipeline.io import write_stage
from app.pipeline.preprocess import sample_frames
from app.pipeline.segment import segment_rallies
from app.pipeline.track import CentroidTracker


def read_video(path: str, max_frames: int = 2400):
    capture = cv2.VideoCapture(path)
    frames = []
    fps = capture.get(cv2.CAP_PROP_FPS) or 25
    while len(frames) < max_frames * 4:
        ok, frame = capture.read()
        if not ok:
            break
        frames.append(frame)
    capture.release()
    return frames, fps


def analyze_frames(frames: list, sport: str, job_dir: Path, source_fps: float = 8, focus_hint: dict | None = None) -> dict:
    sampled, prep = sample_frames(frames, source_fps=source_fps, target_fps=8, max_frames=2400)
    write_stage(job_dir, "01_preprocess", prep)
    if len(sampled) < 2:
        segment = {"t0": 0, "t1": 0, "note": "Video troppo corto: tutto non classificato."}
        write_stage(job_dir, "08_aggregate", {"shots": [], "unclassified_segments": [segment]})
        return {"shots": [], "rallies": [], "unclassified_segments": [segment], "observation": _observation(False, False)}

    quad = find_court_quad(sampled[len(sampled) // 2])
    court_visible = quad is not None
    matrix = None
    size = (10.0, 20.0)
    if quad is not None:
        matrix, size = homography_from_quad(quad, sport)
    write_stage(job_dir, "02_court", {"visible": court_visible, "sport": sport, "size_m": list(size)})

    tracker = CentroidTracker()
    player_frames: list[list[dict]] = [[]]
    ball_raw: list[dict | None] = [None]
    for index in range(1, len(sampled)):
        boxes = motion_boxes(sampled[index - 1], sampled[index])
        tracks = tracker.update(boxes)
        player_frames.append(tracks)
        balls = ball_candidates(sampled[index])
        ball_raw.append(balls[0] if balls else None)
    write_stage(job_dir, "03_players", {"frames_with_players": sum(1 for frame in player_frames if frame)})
    ball = interpolate(ball_raw)
    write_stage(job_dir, "04_ball", {"seen": sum(1 for point in ball_raw if point), "interpolated": sum(1 for point in ball if point and point.get("interpolated"))})

    impacts = find_impacts(ball, player_frames)
    if focus_hint and impacts:
        impacts = [impact for impact in impacts if _near_hint(impact, focus_hint)] or impacts
    rallies = segment_rallies(impacts, fps=8)
    write_stage(job_dir, "05_segment", {"impacts": len(impacts), "rallies": len(rallies)})

    classifier = HeuristicShotClassifier()
    shots = []
    rally_payloads = []
    height, width = sampled[0].shape[:2]
    for rally_index, rally in enumerate(rallies):
        rally_id = f"r{rally_index + 1}"
        rally_payloads.append({
            "id": rally_id,
            "number": rally_index + 1,
            "tStart": rally[0]["frame"] / 8,
            "tEnd": rally[-1]["frame"] / 8 + 0.4,
            "winnerTeam": None,
            "serverTeam": 1 if rally_index == 0 else None,
        })
        for shot_index, impact in enumerate(rally):
            image_y = impact["y"] / height
            image_x = impact["x"] / width
            guessed = classifier.classify({
                "index_in_rally": shot_index,
                "image_y": image_y,
                "sport": sport,
                "court_visible": court_visible,
            })
            land_x, land_y = image_x, 1 - image_y
            if matrix is not None:
                land_x, land_y = image_to_court(matrix, impact["x"], impact["y"], size)
            # The impact point is the player, not a measured bounce. Do not invent net or out.
            outcome = {
                "outcome": "unclassified",
                "reason": None,
                "cause": None,
                "confidence": guessed["confidence"],
                "rule": "landing_not_separated",
            }
            shots.append({
                "id": f"s{len(shots) + 1}",
                "rallyId": rally_id,
                "tImpact": round(impact["frame"] / 8, 2),
                "type": guessed["type"],
                "bodySide": "unknown",
                "impactX": round(image_x, 3),
                "impactY": round(1 - image_y, 3),
                "landX": round(land_x, 3),
                "landY": round(land_y, 3),
                "impactHeight": 1,
                "outcome": outcome["outcome"],
                "errorReason": outcome["reason"],
                "errorCause": outcome["cause"],
                "situation": "baseline",
                "confidence": outcome["confidence"],
                "manuallyCorrected": False,
                "serveNumber": 1 if guessed["type"] == "serve" else None,
                "example": False,
                "note": guessed["note"],
                "team": 1,
            })
    segments = []
    if not shots:
        duration = len(sampled) / 8
        segments.append({"t0": 0, "t1": duration, "note": "Nessun impatto chiaro. Il video resta non classificato."})
    if prep["omitted_tail"]:
        segments.append({"t0": len(sampled) / 8, "t1": (len(sampled) + prep["omitted_tail"]) / 8, "note": "Coda oltre il limite di fotogrammi, non classificata."})
    observation = _observation(court_visible, any(ball_raw))
    write_stage(job_dir, "06_classify", {"shots": len(shots)})
    write_stage(job_dir, "07_outcome", {"classified_outcomes": sum(1 for shot in shots if shot["outcome"] != "unclassified")})
    write_stage(job_dir, "08_aggregate", {"shots": len(shots), "unclassified_segments": segments, "errors": sum(1 for shot in shots if "error" in shot["outcome"])})
    return {"shots": shots, "rallies": rally_payloads, "unclassified_segments": segments, "observation": observation, "duration": len(sampled) / 8}


def _near_hint(impact: dict, hint: dict) -> bool:
    return abs(impact["x"] - hint.get("x", impact["x"])) < hint.get("tolerance", 10_000)


def _observation(court: bool, ball: bool) -> dict:
    return {"court": court, "ball": ball, "pose": False, "position": court}
