import math


def interpolate(points: list[dict | None]) -> list[dict | None]:
    filled = list(points)
    indexes = [index for index, point in enumerate(points) if point is not None]
    for left, right in zip(indexes, indexes[1:]):
        start = points[left]
        end = points[right]
        if start is None or end is None:
            continue
        span = right - left
        for step in range(1, span):
            weight = step / span
            filled[left + step] = {
                "x": start["x"] + (end["x"] - start["x"]) * weight,
                "y": start["y"] + (end["y"] - start["y"]) * weight,
                "interpolated": True,
            }
    return filled


def _angle(dx: float, dy: float) -> float:
    return math.degrees(math.atan2(dy, dx))


def find_impacts(ball: list[dict | None], players: list[list[dict]], max_distance: float = 48) -> list[dict]:
    impacts = []
    last_time = -10
    for index in range(2, len(ball) - 1):
        prev, cur, nxt = ball[index - 1], ball[index], ball[index + 1]
        if not prev or not cur or not nxt:
            continue
        before = _angle(cur["x"] - prev["x"], cur["y"] - prev["y"])
        after = _angle(nxt["x"] - cur["x"], nxt["y"] - cur["y"])
        turn = abs((after - before + 180) % 360 - 180)
        if turn < 50:
            continue
        nearest = None
        nearest_distance = max_distance
        for player in players[index] if index < len(players) else []:
            distance = ((player["x"] - cur["x"]) ** 2 + (player["y"] - cur["y"]) ** 2) ** 0.5
            if distance < nearest_distance:
                nearest = player
                nearest_distance = distance
        if nearest is None or index - last_time < 3:
            continue
        last_time = index
        impacts.append({"frame": index, "x": cur["x"], "y": cur["y"], "player_id": nearest.get("id"), "turn": turn})
    return impacts
