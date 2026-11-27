class HeuristicShotClassifier:
    """Rule classifier. A trained model can implement the same classify() method."""

    def classify(self, features: dict) -> dict:
        index = features.get("index_in_rally", 0)
        image_y = features.get("image_y", 0.7)
        sport = features.get("sport", "padel")
        court_visible = features.get("court_visible", False)
        cap = 0.55 if court_visible else 0.32
        if index == 0 and image_y > 0.45:
            kind = "serve"
            confidence = 0.46
        elif index == 1:
            kind = "return"
            confidence = 0.38
        elif image_y < 0.42:
            kind = "forehand_volley"
            confidence = 0.3
        else:
            kind = "forehand" if sport == "tennis" else "bandeja" if image_y < 0.55 else "forehand"
            confidence = 0.28
        if not court_visible:
            confidence *= 0.6
        return {
            "type": kind,
            "outcome": "unclassified",
            "confidence": round(min(cap, confidence), 2),
            "note": "Stima euristica. L'esito geometrico, se c'è, arriva dal modulo successivo.",
        }
