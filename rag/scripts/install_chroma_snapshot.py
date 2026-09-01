from __future__ import annotations

import argparse
import hashlib
import shutil
import tempfile
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
    parser = argparse.ArgumentParser(description="공유받은 Chroma ZIP 설치")
    parser.add_argument("archive", type=Path)
    parser.add_argument("--sha256", dest="expected_sha256")
    parser.add_argument("--db-path", type=Path, default=root / "chroma_db")
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()

    actual = sha256(args.archive)
    if args.expected_sha256 and actual.lower() != args.expected_sha256.lower():
        raise ValueError(f"SHA-256 불일치: expected={args.expected_sha256}, actual={actual}")
    if args.db_path.exists() and not args.replace:
        raise FileExistsError("기존 chroma_db가 있습니다. 교체하려면 --replace를 추가하세요.")

    with tempfile.TemporaryDirectory() as temporary:
        temporary_path = Path(temporary)
        with zipfile.ZipFile(args.archive) as source:
            for member in source.infolist():
                destination = (temporary_path / member.filename).resolve()
                if temporary_path.resolve() not in destination.parents:
                    raise ValueError("안전하지 않은 ZIP 경로가 포함되어 있습니다.")
            source.extractall(temporary_path)
        extracted = temporary_path / "chroma_db"
        if not (extracted / "build_manifest.json").is_file():
            raise ValueError("유효한 Chroma 스냅샷이 아닙니다.")
        if args.db_path.exists():
            shutil.rmtree(args.db_path)
        shutil.copytree(extracted, args.db_path)

    print(f"설치 완료: {args.db_path.resolve()}")
    print(f"ZIP SHA-256: {actual}")


if __name__ == "__main__":
    main()
