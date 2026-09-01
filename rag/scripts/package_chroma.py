from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description="Chroma DB를 공유용 ZIP으로 패키징")
    parser.add_argument("--db-path", type=Path, default=root / "chroma_db")
    parser.add_argument("--output-dir", type=Path, default=root / "dist")
    args = parser.parse_args()

    manifest_path = args.db_path / "build_manifest.json"
    if not manifest_path.is_file():
        raise FileNotFoundError("먼저 build_chroma.py로 DB와 build_manifest.json을 생성하세요.")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    input_hash = manifest["input_sha256"][:12]
    archive = args.output_dir / f"findependence-chroma-{input_hash}.zip"
    args.output_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as target:
        for file in sorted(args.db_path.rglob("*")):
            if file.is_file():
                target.write(file, Path("chroma_db") / file.relative_to(args.db_path))

    checksum = sha256(archive)
    checksum_path = archive.with_suffix(archive.suffix + ".sha256")
    checksum_path.write_text(f"{checksum}  {archive.name}\n", encoding="ascii")
    print(f"공유 파일: {archive.resolve()}")
    print(f"검증 파일: {checksum_path.resolve()}")


if __name__ == "__main__":
    main()
