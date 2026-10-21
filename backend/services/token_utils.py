import re

def estimate_tokens(text: str) -> int:
    """Roughly estimates token count based on word count."""
    if not text:
        return 0
    words = len(re.findall(r'\w+', text))
    return int(words * 1.33)

def compress_to_limit(text: str, max_tokens: int = 6000) -> str:
    """Compresses text to fit within the token limit, prioritizing table data."""
    if estimate_tokens(text) <= max_tokens:
        return text

    paragraphs = text.split("\n\n")
    if len(paragraphs) <= 1:
        return text[:int(max_tokens * 4)]

    data_paragraphs = []
    normal_paragraphs = []
    for p in paragraphs:
        if "|" in p or any(c.isdigit() for c in p[:20]):
            data_paragraphs.append(p)
        else:
            normal_paragraphs.append(p)

    result = []
    data_budget = int(max_tokens * 0.6)
    normal_budget = int(max_tokens * 0.4)

    data_text = "\n\n".join(data_paragraphs)
    result.append(data_text[:int(data_budget * 4)])

    normal_text = "\n\n".join(normal_paragraphs)
    result.append(normal_text[:int(normal_budget * 4)])

    compressed = "\n\n".join(result)
    compressed += "\n\n[Note: Source document was too long, compressed prioritizing key data]"
    return compressed