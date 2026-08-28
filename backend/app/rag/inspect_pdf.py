import fitz

PDF_PATH = "../../data/2015.pdf"

document = fitz.open(PDF_PATH)

print("Number of pages:", len(document))

for page_number, page in enumerate(document):
    text = page.get_text()

    print(f"\n--- PAGE {page_number + 1} ---")
    print(text[:2000])

document.close()