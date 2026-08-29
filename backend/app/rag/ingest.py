from pathlib import Path
import json
import re
import pymupdf


# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[3]

PDF_PATH = BASE_DIR / "data" / "2015.pdf"
OUTPUT_DIR = BASE_DIR / "data" / "processed"
OUTPUT_PATH = OUTPUT_DIR / "2015_events.json"


# --------------------------------------------------
# PDF TEXT EXTRACTION
# --------------------------------------------------

def extract_pdf_text(pdf_path):
    document = pymupdf.open(pdf_path)

    text = ""

    for page in document:
        text += page.get_text("text") + "\n"

    document.close()

    return text


# --------------------------------------------------
# CLEAN PDF TEXT
# --------------------------------------------------

def clean_text(text):
    # Remove page markers
    text = re.sub(r"--- PAGE \d+ ---", "", text)

    # Remove continuation markers
    text = re.sub(r"\[PART \d+ - CONTINUATION\]", "", text)

    # Fix common PDF line wrapping
    text = re.sub(r"[ \t]+\n", "\n", text)

    # Remove excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# --------------------------------------------------
# FIND EVENT BLOCKS
# --------------------------------------------------

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
            # The line right before "Date:" is the title
            current_title = last_line
            current_lines = [line]

        else:
            if current_title is not None:
                current_lines.append(line)

        if line.startswith("Source:"):

            event_text = "\n".join(current_lines)

            if current_title:
                events.append({
                    "title": current_title,
                    "text": event_text
                })

            current_title = None
            current_lines = []

        last_line = line

    return events
# --------------------------------------------------
# FIELD EXTRACTION
# --------------------------------------------------

def extract_field(text, field_name, next_fields):
    """
    Extract text between one field and the next field.
    """

    pattern = rf"{re.escape(field_name)}:\s*(.*?)(?=\n(?:{'|'.join(re.escape(field) + ':' for field in next_fields)})|\Z)"

    match = re.search(pattern, text, re.DOTALL)

    if match:
        return match.group(1).strip()

    return ""


# --------------------------------------------------
# PARSE EVENT
# --------------------------------------------------

def parse_event(event):
    text = event["text"]

    parsed = {
        "title": event["title"],
        "date": extract_field(
            text,
            "Date",
            [
                "Category",
                "Location",
                "People/Organizations",
                "Company",
                "Product",
                "Mission",
                "Objective",
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "category": extract_field(
            text,
            "Category",
            [
                "Location",
                "People/Organizations",
                "Company",
                "Product",
                "Mission",
                "Objective",
                "Result",
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "location": extract_field(
            text,
            "Location",
            [
                "People/Organizations",
                "Company",
                "Product",
                "Mission",
                "Objective",
                "Result",
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "people_organizations": extract_field(
            text,
            "People/Organizations",
            [
                "Company",
                "Product",
                "Mission",
                "Objective",
                "Result",
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "company": extract_field(
            text,
            "Company",
            [
                "Product",
                "Mission",
                "Objective",
                "Result",
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "product": extract_field(
            text,
            "Product",
            [
                "Mission",
                "Objective",
                "Result",
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "mission": extract_field(
            text,
            "Mission",
            [
                "Objective",
                "Result",
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "objective": extract_field(
            text,
            "Objective",
            [
                "Result",
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "result": extract_field(
            text,
            "Result",
            [
                "What happened",
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "what_happened": extract_field(
            text,
            "What happened",
            [
                "Why it mattered in 2015",
                "Source"
            ]
        ),
        "why_it_mattered": extract_field(
            text,
            "Why it mattered in 2015",
            [
                "Source"
            ]
        ),
        "source": extract_field(
            text,
            "Source",
            []
        ),
        "year": 2015
    }

    return parsed


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    if not PDF_PATH.exists():
        raise FileNotFoundError(
            f"\n2015 PDF not found:\n{PDF_PATH}"
        )

    print("Reading PDF:")
    print(PDF_PATH)

    raw_text = extract_pdf_text(PDF_PATH)

    print(f"Characters extracted: {len(raw_text):,}")

    cleaned_text = clean_text(raw_text)
    print("Text cleaned.")

    raw_events = extract_event_blocks(cleaned_text)

    print(f"Event blocks found: {len(raw_events)}")

    events = []

    for event in raw_events:
        parsed = parse_event(event)

        # Only keep records with a title and date.
        if parsed["title"] and parsed["date"]:
            events.append(parsed)

    print(f"Valid events parsed: {len(events)}")

    # Create processed directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save JSON
    with open(
        OUTPUT_PATH,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            events,
            file,
            indent=2,
            ensure_ascii=False
        )

    print()
    print("SUCCESS")
    print("Processed data saved to:")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()