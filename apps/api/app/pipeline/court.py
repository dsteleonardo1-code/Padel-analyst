import cv2
import numpy as np

COURT_METERS = {
    "padel": (10.0, 20.0),
    "tennis": (10.97, 23.77),
}


def order_quad(points: np.ndarray) -> np.ndarray:
    pts = np.array(points, dtype="float32").reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")
    sums = pts.sum(axis=1)
    rect[0] = pts[np.argmin(sums)]
    rect[2] = pts[np.argmax(sums)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def find_court_quad(frame: np.ndarray):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (30, 30, 30), (95, 255, 255))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) < 80:
        return None
    peri = cv2.arcLength(contour, True)
    approx = cv2.approxPolyDP(contour, 0.03 * peri, True)
    if len(approx) != 4:
        box = cv2.boxPoints(cv2.minAreaRect(contour))
        approx = box.reshape(-1, 1, 2)
    return order_quad(approx)


def homography_from_quad(quad: np.ndarray, sport: str):
    width, length = COURT_METERS.get(sport, COURT_METERS["tennis"])
    destination = np.array([[0, 0], [width, 0], [width, length], [0, length]], dtype="float32")
    matrix = cv2.getPerspectiveTransform(quad.astype("float32"), destination)
    return matrix, (width, length)


def image_to_court(matrix: np.ndarray, x: float, y: float, size: tuple[float, float]) -> tuple[float, float]:
    point = cv2.perspectiveTransform(np.array([[[x, y]]], dtype="float32"), matrix)[0, 0]
    width, length = size
    return float(point[0] / width), float(point[1] / length)
