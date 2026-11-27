import cv2
import numpy as np


def motion_boxes(previous: np.ndarray, frame: np.ndarray, min_area: int = 80, max_area: int = 20000) -> list[dict]:
    delta = cv2.absdiff(previous, frame)
    gray = cv2.cvtColor(delta, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 25, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    boxes = []
    for contour in contours:
        x, y, width, height = cv2.boundingRect(contour)
        area = width * height
        if min_area <= area <= max_area:
            boxes.append({"x": x + width / 2, "y": y + height / 2, "w": width, "h": height, "area": area})
    return boxes


def ball_candidates(frame: np.ndarray) -> list[dict]:
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (15, 70, 70), (45, 255, 255))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    found = []
    for contour in contours:
        x, y, width, height = cv2.boundingRect(contour)
        area = width * height
        if 4 <= area <= 80:
            found.append({"x": x + width / 2, "y": y + height / 2})
    return found
