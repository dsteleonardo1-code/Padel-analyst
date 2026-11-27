def analyze_match(match_id: str, job_id: str) -> None:
    from app.runner import run_analysis

    run_analysis(match_id, job_id)
