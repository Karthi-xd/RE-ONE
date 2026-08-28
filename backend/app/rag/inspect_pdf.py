from pathlib import Path
import pymupdf

PROJECT_ROOT = Path(__file__).resolve().parents[3]
PDF_PATH = PROJECT_ROOT / "data" / "2015.pdf"

print("Looking for PDF at:")
print(PDF_PATH)

if not PDF_PATH.exists():
    raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

document = pymupdf.open(PDF_PATH)

print(f"\nNumber of pages: {len(document)}")

for page_number, page in enumerate(document):
    text = page.get_text()

    print(f"\n--- PAGE {page_number + 1} ---")
    print(text[:2000])

document.close()