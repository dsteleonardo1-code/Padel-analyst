class CentroidTracker:
    """Stable ids by nearest centroid. A ByteTrack adapter can replace this class."""

    def __init__(self, max_distance: float = 80, max_misses: int = 8):
        self.max_distance = max_distance
        self.max_misses = max_misses
        self._next = 1
        self.tracks: dict[int, dict] = {}

    def update(self, detections: list[dict]) -> list[dict]:
        unused = set(self.tracks)
        assigned = []
        for detection in detections:
            best_id = None
            best_distance = self.max_distance
            for track_id in list(unused):
                track = self.tracks[track_id]
                distance = ((track["x"] - detection["x"]) ** 2 + (track["y"] - detection["y"]) ** 2) ** 0.5
                if distance < best_distance:
                    best_distance = distance
                    best_id = track_id
            if best_id is None:
                best_id = self._next
                self._next += 1
                self.tracks[best_id] = {"x": detection["x"], "y": detection["y"], "misses": 0}
            else:
                unused.discard(best_id)
                self.tracks[best_id]["x"] = detection["x"]
                self.tracks[best_id]["y"] = detection["y"]
                self.tracks[best_id]["misses"] = 0
            assigned.append({**detection, "id": best_id})
        for track_id in unused:
            self.tracks[track_id]["misses"] += 1
            if self.tracks[track_id]["misses"] > self.max_misses:
                del self.tracks[track_id]
        return assigned
