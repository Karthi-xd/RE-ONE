import sys
import json
from pathlib import Path

YEAR = sys.argv[1]

BASE_DIR = Path(__file__).resolve().parents[3]
INPUT_PATH = BASE_DIR / "data" / "processed" / f"{YEAR}_events.json"
OUTPUT_PATH = BASE_DIR / "data" / "processed" / f"{YEAR}_chunks.json"


def build_chunk_text(event):
    parts = []
    if event.get("what_happened"):
        parts.append(event["what_happened"])
    if event.get("why_it_mattered"):
        parts.append("Why it mattered: " + event["why_it_mattered"])
    return f"{event['title']} ({event['date']}). " + " ".join(parts)


def main():
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        events = json.load(f)

    chunks = []
    for i, event in enumerate(events):
        chunks.append({
            "id": f"{YEAR}_{i}",
            "text": build_chunk_text(event),
            "metadata": {
                "title": event.get("title"),
                "date": event.get("date"),
                "category": event.get("category"),
                "source": event.get("source"),
                "year": int(YEAR)
            }
        })

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)

    print(f"Chunks created: {len(chunks)}")
    print(f"Saved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()