import sys
from pathlib import Path
import json
import re
import pymupdf

YEAR = sys.argv[1]

BASE_DIR = Path(__file__).resolve().parents[3]
PDF_PATH = BASE_DIR / "data" / f"{YEAR}.pdf"
OUTPUT_DIR = BASE_DIR / "data" / "processed"
OUTPUT_PATH = OUTPUT_DIR / f"{YEAR}_events.json"


def extract_pdf_text(pdf_path):
    document = pymupdf.open(pdf_path)
    text = ""
    for page in document:
        text += page.get_text("text") + "\n"
    document.close()
    return text


def clean_text(text):
    text = re.sub(r"--- PAGE \d+ ---", "", text)
    text = re.sub(r"\[PART \d+ - CONTINUATION\]", "", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_event_blocks(text):
    lines = text.splitlines()
    events = []
    current_title = None
    current_lines = []
    last_line = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line.startswith("Date:"):
            current_title = last_line
            current_lines = [line]
        else:
            if current_title is not None:
                current_lines.append(line)

        if line.startswith("Source:"):
            event_text = "\n".join(current_lines)
            if current_title:
                events.append({"title": current_title, "text": event_text})
            current_title = None
            current_lines = []

        last_line = line

    return events


def extract_field(text, field_name, next_fields):
    pattern = rf"{re.escape(field_name)}:\s*(.*?)(?=\n(?:{'|'.join(re.escape(f) + ':' for f in next_fields)})|\Z)"
    match = re.search(pattern, text, re.DOTALL)
    return match.group(1).strip() if match else ""


def parse_event(event):
    text = event["text"]
    why_field = f"Why it mattered in {YEAR}"

    all_fields = [
        "Category", "Location", "People/Organizations", "Company",
        "Product", "Mission", "Objective", "Result",
        "What happened", why_field, "Source"
    ]

    def rest_after(field):
        idx = all_fields.index(field)
        return all_fields[idx + 1:]

    parsed = {"title": event["title"]}
    parsed["date"] = extract_field(text, "Date", rest_after("Category") if "Category" in all_fields else all_fields)
    for field in all_fields:
        key = field.lower().replace("/", "_").replace(" ", "_")
        if field == why_field:
            key = "why_it_mattered"
        parsed[key] = extract_field(text, field, rest_after(field))

    parsed["year"] = int(YEAR)
    return parsed


def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"\n{YEAR} PDF not found:\n{PDF_PATH}")

    print(f"Reading PDF: {PDF_PATH}")
    raw_text = extract_pdf_text(PDF_PATH)
    print(f"Characters extracted: {len(raw_text):,}")

    cleaned_text = clean_text(raw_text)
    print("Text cleaned.")

    raw_events = extract_event_blocks(cleaned_text)
    print(f"Event blocks found: {len(raw_events)}")

    events = [parse_event(e) for e in raw_events if e["title"]]
    events = [e for e in events if e.get("date")]

    print(f"Valid events parsed: {len(events)}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2, ensure_ascii=False)

    print(f"\nSUCCESS\nSaved to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()