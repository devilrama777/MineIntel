import json
from pathlib import Path
import pandas as pd
import requests

from backend import config
from backend.services.converter import MarkdownConverter

def run():
    base_dir = Path(__file__).resolve().parent
    reported_data_dir = base_dir / "reported_data"
    output_dir = base_dir / "processed_output"
    output_dir.mkdir(parents=True, exist_ok=True)

    csv_files = list(reported_data_dir.glob("*.csv"))
    print(f"Found {len(csv_files)} CSV files in {reported_data_dir}:")
    for f in csv_files:
        print(f" - {f.name}")

    # 1. Convert each CSV into clean Markdown
    converter = MarkdownConverter()
    all_markdown_parts = []

    for file_path in csv_files:
        print(f"\nProcessing {file_path.name}...")
        res = converter.convert_csv_to_markdown(file_path)
        all_markdown_parts.append(f"## File: {file_path.name}\n\n" + res["markdown"] + "\n\n---\n")

    combined_markdown = "\n".join(all_markdown_parts)
    
    # Save the combined converted Markdown
    md_output_path = output_dir / "converted_data.md"
    md_output_path.write_text(combined_markdown, encoding="utf-8")
    print(f"\nSaved combined Markdown to: {md_output_path}")

    # 2. Send to Ollama with the exact user command
    user_command = Path(config.PROMPTS_DIR / "llama_csv_prompt.txt").read_text(encoding="utf-8").strip()
    print(f"\nSending to Ollama ({config.LLAMA_MODEL}) with command:\n\"{user_command}\"")

    ollama_url = f"{config.OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": config.LLAMA_MODEL,
        "prompt": f"{combined_markdown}\n\nInstruction: {user_command}",
        "system": user_command,
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }

    try:
        resp = requests.post(ollama_url, json=payload, timeout=300)
        if resp.status_code != 200:
            print(f"Ollama Error {resp.status_code}: {resp.text}")
            raise Exception(f"Ollama returned status {resp.status_code}")
    except requests.exceptions.ConnectionError:
        print("ERROR: Ollama is not available. The local LLM server is not running.")
        print("Please start Ollama with: ollama serve")
        print("Then pull the model with: ollama pull llama3.1")
        summary_text = "# LLM UNAVAILABLE\n\nThe local Ollama server is not running. Please start Ollama and retry.\n\n⚠️ This is a fallback notice - no AI analysis was performed."
        summary_path = output_dir / "llama_summary.md"
        summary_path.write_text(summary_text, encoding="utf-8")
        return
    except Exception as e:
        print(f"ERROR: Failed to connect to Ollama: {e}")
        summary_text = f"# LLM ERROR\n\nFailed to connect to Ollama: {e}\n\n⚠️ This is a fallback notice - no AI analysis was performed."
        summary_path = output_dir / "llama_summary.md"
        summary_path.write_text(summary_text, encoding="utf-8")
        return

    summary_text = resp.json().get("response", "").strip()

    # Save summary
    summary_path = output_dir / "llama_summary.md"
    summary_path.write_text(summary_text, encoding="utf-8")
    print(f"\nSaved LLaMA Summary to: {summary_path}")
    print("\n" + "=" * 60)
    print("LLAMA 3.1 SUMMARY OUTPUT:")
    print("=" * 60)
    print(summary_text)

if __name__ == "__main__":
    run()
