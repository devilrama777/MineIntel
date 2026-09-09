import requests
import zipfile
import io
from pathlib import Path

target_dir = Path(__file__).resolve().parent / "sih_mining_repo"
target_dir.mkdir(parents=True, exist_ok=True)

url = "https://github.com/Skywithsakshamm/sih-mining/archive/refs/heads/main.zip"
print(f"Downloading from {url}...")
resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
print("Status code:", resp.status_code)

if resp.status_code == 200:
    with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
        z.extractall(target_dir)
    print("Extracted successfully into:", target_dir)
    for p in target_dir.rglob("*"):
        if p.is_file():
            print(" -", p.relative_to(target_dir))
else:
    print("Failed to download zip")
