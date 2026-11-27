import numpy as np

from app.pipeline.ball import find_impacts, interpolate
from app.pipeline.classify import HeuristicShotClassifier
from app.pipeline.court import find_court_quad, homography_from_quad, image_to_court
from app.pipeline.outcome import judge_outcome
from app.pipeline.preprocess import sample_frames
from app.pipeline.run import analyze_frames
from app.pipeline.segment import segment_rallies
from app.pipeline.track import CentroidTracker


def test_sample_frames_keeps_the_tail_visible():
    frames = list(range(30))
    sampled, meta = sample_frames(frames, source_fps=24, target_fps=8, max_frames=4)
    assert len(sampled) == 4
    assert meta["omitted_tail"] > 0


def test_court_homography_maps_corners():
    image = np.zeros((400, 240, 3), np.uint8)
    image[40:360, 30:210] = (40, 150, 40)
    quad = find_court_quad(image)
    assert quad is not None
    matrix, size = homography_from_quad(quad, "padel")
    origin = image_to_court(matrix, float(quad[0][0]), float(quad[0][1]), size)
    far = image_to_court(matrix, float(quad[2][0]), float(quad[2][1]), size)
    assert abs(origin[0]) < 0.08 and abs(origin[1]) < 0.08
    assert abs(far[0] - 1) < 0.08 and abs(far[1] - 1) < 0.08


def test_tracker_keeps_ids():
    tracker = CentroidTracker(max_distance=30)
    first = tracker.update([{"x": 10, "y": 10}, {"x": 90, "y": 12}])
    second = tracker.update([{"x": 14, "y": 11}, {"x": 88, "y": 14}])
    assert {item["id"] for item in first} == {item["id"] for item in second}


def test_ball_interpolation_and_impacts():
    filled = interpolate([{"x": 0, "y": 0}, None, {"x": 10, "y": 10}])
    assert filled[1] is not None
    assert abs(filled[1]["x"] - 5) < 0.01
    ball = [{"x": index * 8, "y": 40} for index in range(8)]
    ball += [{"x": 56 - index * 8, "y": 40} for index in range(8)]
    players = [[{"id": 1, "x": 56, "y": 40}] for _ in ball]
    impacts = find_impacts(ball, players, max_distance=20)
    assert impacts
    assert len(segment_rallies(impacts, fps=8, gap_seconds=0.1)) >= 1


def test_classifier_and_outcome_are_estimates():
    guess = HeuristicShotClassifier().classify({"index_in_rally": 0, "image_y": 0.8, "sport": "padel", "court_visible": True})
    assert guess["type"] == "serve"
    assert guess["outcome"] == "unclassified"
    assert guess["confidence"] <= 0.55
    assert judge_outcome({"sport": "padel", "type": "forehand", "land_x": 0.5, "land_y": 0.5})["reason"] == "net"
    assert judge_outcome({"sport": "padel", "type": "forehand", "land_x": 0.4, "land_y": 0.8, "hit_wall_before_bounce": True})["reason"] == "direct_wall"
    assert judge_outcome({"sport": "tennis", "type": "serve", "land_x": 0.2, "land_y": 1.2, "serve_number": 2})["reason"] == "double_fault"
    winner = judge_outcome({"sport": "tennis", "type": "forehand", "land_x": 0.3, "land_y": 0.84, "last_of_rally": True})
    assert winner["outcome"] == "winner"
    assert winner["confidence"] < 0.7
    assert judge_outcome({"type": "unclassified", "land_x": 0.2, "land_y": 0.2})["outcome"] == "unclassified"


def test_analyze_frames_writes_stages_and_does_not_drop_silence(tmp_path):
    frames = []
    for index in range(6):
        frame = np.zeros((180, 120, 3), np.uint8)
        frame[:, :] = (35, 120, 40)
        x = 20 + index * 8
        frame[80:130, x : x + 18] = (230, 230, 230)
        frames.append(frame)
    result = analyze_frames(frames, "padel", tmp_path, source_fps=8)
    for name in ("01_preprocess", "02_court", "03_players", "04_ball", "05_segment", "08_aggregate"):
        assert (tmp_path / f"{name}.json").exists()
    assert result["shots"] or result["unclassified_segments"]
    assert result["observation"]["pose"] is False
