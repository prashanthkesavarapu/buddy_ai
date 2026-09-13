from pypdf import PdfReader


def extract_text_from_pdf(
    file_path: str,
    max_characters: int = 30_000,
) -> str:
    reader = PdfReader(file_path)

    pages = []
    total_characters = 0

    for page in reader.pages:
        text = page.extract_text() or ""

        if not text:
            continue

        prefix = "\n\n" if pages else ""
        remaining = max_characters - total_characters

        if remaining <= 0:
            break

        page_text = f"{prefix}{text}"[:remaining]
        pages.append(page_text)
        total_characters += len(page_text)

        if len(page_text) < len(prefix) + len(text):
            break

    return "".join(pages)
