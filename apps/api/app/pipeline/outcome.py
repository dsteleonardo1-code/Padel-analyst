def judge_outcome(features: dict) -> dict:
    """Geometric outcome. Confidence is an estimate, not a measured accuracy."""
    if features.get("type") == "unclassified" or features.get("land_x") is None or features.get("land_y") is None:
        return {"outcome": "unclassified", "reason": None, "cause": None, "confidence": 0.2, "rule": "missing_geometry"}
    land_x = features["land_x"]
    land_y = features["land_y"]
    pressured = bool(features.get("pressured"))
    missed_long = land_y > 1.02 or land_y < -0.02
    missed_wide = land_x < -0.02 or land_x > 1.02
    at_net = 0.47 <= land_y <= 0.53
    missed = missed_long or missed_wide or at_net or bool(features.get("hit_wall_before_bounce"))

    def pack(outcome: str, reason: str | None, confidence: float, rule: str):
        cause = None
        if reason == "position":
            cause = "position"
        elif reason == "easy_ball":
            cause = "decision"
        elif reason == "wrong_shot":
            cause = "shot_selection"
        elif reason:
            cause = "position" if pressured else "technique"
        if pressured and outcome == "unforced_error":
            outcome = "forced_error"
        return {"outcome": outcome, "reason": reason, "cause": cause, "confidence": confidence, "rule": rule}

    if features.get("serve_number") == 2 and missed:
        return pack("unforced_error", "double_fault", 0.58, "second_serve_miss")
    if features.get("sport") == "padel" and features.get("hit_wall_before_bounce"):
        return pack("unforced_error", "direct_wall", 0.42 if pressured else 0.56, "wall_before_bounce")
    if at_net:
        return pack("unforced_error", "net", 0.4 if pressured else 0.6, "net")
    if missed_long:
        return pack("unforced_error", "long", 0.4 if pressured else 0.6, "long")
    if missed_wide:
        return pack("unforced_error", "wide", 0.4 if pressured else 0.6, "wide")
    inside = 0 <= land_x <= 1 and 0 <= land_y <= 1
    if inside and features.get("opponent_winner_next") and land_y < 0.64:
        return pack("unforced_error", "easy_ball", 0.36, "short_ball_then_opponent_winner")
    if inside and features.get("last_of_rally") and not features.get("opponent_winner_next"):
        return {"outcome": "winner", "reason": None, "cause": None, "confidence": 0.48, "rule": "no_return"}
    return {"outcome": "neutral", "reason": None, "cause": None, "confidence": 0.34, "rule": "in_play"}
