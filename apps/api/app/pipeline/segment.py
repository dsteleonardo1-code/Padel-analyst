def segment_rallies(impacts: list[dict], fps: float = 8, gap_seconds: float = 4.5) -> list[list[dict]]:
    rallies: list[list[dict]] = []
    gap_frames = gap_seconds * fps
    for impact in impacts:
        if not rallies or impact["frame"] - rallies[-1][-1]["frame"] > gap_frames:
            rallies.append([impact])
        else:
            rallies[-1].append(impact)
    return rallies
