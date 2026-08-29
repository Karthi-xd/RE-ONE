from pathlib import Path
import re
import json
import pymupdf


# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[3]

PDF_PATH = BASE_DIR / "data" / "2015.pdf"
OUTPUT_DIR = BASE_DIR / "data" / "processed"
OUTPUT_PATH = OUTPUT_DIR / "2015_events.json"


# --------------------------------------------------
# EXTRACT TEXT FROM PDF
# --------------------------------------------------

def extract_pdf_text(pdf_path):
    document = pymupdf.open(pdf_path)

    pages = []

    for page_number, page in enumerate(document, start=1):
        text = page.get_text("text")

        pages.append({
            "page": page_number,
            "text": text
        })

    document.close()

    return pages


# --------------------------------------------------
# CLEAN PDF TEXT
# --------------------------------------------------

def clean_text(text):
    # Remove page markers such as --- PAGE 64 ---
    text = re.sub(r"--- PAGE \d+ ---", "", text)

    # Remove continuation markers
    text = re.sub(r"\[PART \d+ - CONTINUATION\]", "", text)

    # Join lines that were broken by PDF formatting
    text = re.sub(r"\s*\n\s*", "\n", text)

    # Remove excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# --------------------------------------------------
# SPLIT PDF INTO EVENT BLOCKS
# --------------------------------------------------

def split_into_events(text):
    """
    Each event normally begins with a title and is followed by
    Date:, Category:, What happened:, Why it mattered:, Source:, etc.

    We split whenever a new Date: field appears.
    """

    # Split before Date: while keeping the previous title
    blocks = re.split(r"\n(?=Date:\s*)", text)

    events = []

    for block in blocks:
        block = block.strip()

        if not block:
            continue

        # We need at least Date + Category to consider this an event
        if "Date:" not in block or "Category:" not in block:
            continue

        events.append(block)

    return events


# --------------------------------------------------
# EXTRACT FIELD
# --------------------------------------------------

def extract_field(block, field_name):
    pattern = rf"{re.escape(field_name)}:\s*(.*?)(?=\n[A-Z][A-Za-z /&()'-]+:|$)"

    match = re.search(pattern, block, re.DOTALL)

    if match:
        return match.group(1).strip()

    return ""


# --------------------------------------------------
# CREATE STRUCTURED EVENT
# --------------------------------------------------

def parse_event(block):
    lines = block.splitlines()

    # Everything before Date: is treated as the title
    title = ""

    for line in lines:
        if line.startswith("Date:"):
            break

        if line.strip():
            title = line.strip()

    event = {
        "title": title,
        "date": extract_field(block, "Date"),
        "category": extract_field(block, "Category"),
        "location": extract_field(block, "Location"),
        "people_organizations": extract_field(block, "People/Organizations"),
        "company": extract_field(block, "Company"),
        "what_happened": extract_field(block, "What happened"),
        "why_it_mattered": extract_field(block, "Why it mattered in 2015"),
        "source": extract_field(block, "Source"),
        "year": 2015,
        "raw_text": block
    }

    return event


# --------------------------------------------------
# MAIN
# --------------------------------------------------

def main():

    if not PDF_PATH.exists():
        raise FileNotFoundError(
            f"2015 PDF not found at:\n{PDF_PATH}"
        )

    print(f"Reading PDF:")
    print(PDF_PATH)

    pages = extract_pdf_text(PDF_PATH)

    print(f"Pages extracted: {len(pages)}")

    # Combine all pages
    full_text = "\n".join(
        page["text"] for page in pages
    )

    full_text = clean_text(full_text)

    print("Text cleaned.")

    # Split into events
    blocks = split_into_events(full_text)

    print(f"Possible event blocks found: {len(blocks)}")

    # Convert blocks into structured events
    events = []

    for block in blocks:
        event = parse_event(block)

        if event["title"]:
            events.append(event)

    print(f"Events parsed: {len(events)}")

    # Create output directory
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
    print(f"Output saved to:")
    print(OUTPUT_PATH)


if __name__ == "__main__":
    main()