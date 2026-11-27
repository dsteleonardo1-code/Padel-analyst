import json
from pathlib import Path


def write_stage(directory: Path, name: str, payload: dict) -> Path:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{name}.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path
