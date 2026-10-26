"""Create a portable ZIP only after the complete archive is ready to publish."""

from pathlib import Path, PurePosixPath
from PIL import Image
import hashlib
import io
import json
import os
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT.parent / 'Pephelia_Twin_Remake_Complete.zip'
PREFIX = 'Pephelia_Twin_Remake/'
EXCLUDED = {'node_modules', '.next', '.git', '__pycache__'}

decoded = 0
for p in (ROOT / 'public/assets').iterdir():
    if p.suffix.lower() in {'.png', '.webp'}:
        with Image.open(p) as im:
            im.load()
        exported = ROOT / 'out/assets' / p.name
        if exported.exists():
            assert p.read_bytes() == exported.read_bytes(), p
        decoded += 1

files = []
for parent, dirs, names in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in EXCLUDED]
    for name in names:
        if name.endswith('.tsbuildinfo') or name in {'.DS_Store', 'SHA256SUMS.txt'}:
            continue
        p = Path(parent) / name
        assert not p.is_symlink(), p
        files.append(p)
files.sort()

source_hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(ROOT / 'SHA256SUMS.txt').write_text(
    ''.join(f'{digest}  {name}\n' for name, digest in source_hashes.items()),
    encoding='utf-8',
)
files.append(ROOT / 'SHA256SUMS.txt')

buffer = io.BytesIO()
seen = set()
with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_STORED, allowZip64=False) as archive:
    for p in files:
        name = PREFIX + p.relative_to(ROOT).as_posix()
        assert name.isascii(), name
        assert not PurePosixPath(name).is_absolute() and '..' not in PurePosixPath(name).parts, name
        assert name.casefold() not in seen, name
        assert not any(c in name for c in '<>:"\\|?*'), name
        seen.add(name.casefold())
        info = zipfile.ZipInfo(name, date_time=(2026, 10, 26, 0, 0, 0))
        info.create_system = 0
        info.create_version = 20
        info.extract_version = 20
        info.compress_type = zipfile.ZIP_STORED
        info.external_attr = 0x20
        archive.writestr(info, p.read_bytes())

payload = buffer.getvalue()
expected_hash = hashlib.sha256(payload).hexdigest()
with tempfile.NamedTemporaryFile(prefix='.pephelia-', suffix='.tmp', dir=DEST.parent, delete=False) as temp:
    temp_name = Path(temp.name)
    try:
        view = memoryview(payload)
        while view:
            written = temp.write(view)
            if written is None or written <= 0:
                raise OSError('Archive write did not complete')
            view = view[written:]
        temp.flush()
        os.fsync(temp.fileno())
    except BaseException:
        temp_name.unlink(missing_ok=True)
        raise
assert temp_name.stat().st_size == len(payload)
assert hashlib.sha256(temp_name.read_bytes()).hexdigest() == expected_hash
os.replace(temp_name, DEST)
directory_fd = os.open(DEST.parent, os.O_RDONLY)
try:
    os.fsync(directory_fd)
finally:
    os.close(directory_fd)

with zipfile.ZipFile(DEST) as archive:
    assert archive.testzip() is None
    assert len(archive.infolist()) == len(files)
    with tempfile.TemporaryDirectory(prefix='pephelia-extract-', dir=DEST.parent) as extracted:
        archive.extractall(extracted)
        for p in files:
            recovered = Path(extracted) / PREFIX / p.relative_to(ROOT)
            assert hashlib.sha256(recovered.read_bytes()).digest() == hashlib.sha256(p.read_bytes()).digest(), p

independent = 'not available'
if shutil.which('unzip'):
    tested = subprocess.run(['unzip', '-tqq', str(DEST)], capture_output=True, text=True)
    assert tested.returncode == 0, tested.stdout + tested.stderr
    independent = 'passed (Info-ZIP unzip)'

assert DEST.stat().st_size == len(payload)
assert hashlib.sha256(DEST.read_bytes()).hexdigest() == expected_hash
report = {
    'zip': str(DEST), 'files': len(files), 'bytes': len(payload),
    'MiB': round(len(payload) / 1048576, 2), 'sha256': expected_hash,
    'decodedImages': decoded, 'zipCRC': 'passed',
    'fullExtraction': 'passed; every recovered file matches its source',
    'independentArchiveTest': independent,
    'format': 'ZIP_STORED; no encryption; no ZIP64; ASCII paths; DOS file attributes',
}
(ROOT.parent / 'pephelia-remake-package-result.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
