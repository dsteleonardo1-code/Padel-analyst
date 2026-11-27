def sample_frames(frames: list, source_fps: float, target_fps: float = 8, max_frames: int = 2400):
    if not frames:
        return [], {"input_frames": 0, "output_frames": 0, "omitted_tail": 0, "note": "Nessun fotogramma."}
    step = max(1, int(round(max(source_fps, 1) / target_fps)))
    sampled = frames[::step]
    omitted = 0
    if len(sampled) > max_frames:
        omitted = len(sampled) - max_frames
        sampled = sampled[:max_frames]
    return sampled, {
        "input_frames": len(frames),
        "output_frames": len(sampled),
        "step": step,
        "omitted_tail": omitted,
        "note": "I fotogrammi oltre il limite restano non classificati, non vengono scartati in silenzio." if omitted else "",
    }
