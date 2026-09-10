"""Verify and measure already downloaded Linux runtime wheels; installs nothing.

Use Cited's pinned Python environment. Select Linux CPython 3.12 x86_64 wheels
from requirements-runtime.lock with pip download --require-hashes --no-deps
--only-binary=:all:. This script checks selected wheel hashes, versions and
recursive dependencies (including the API extra), then measures ZIP entries.
The output is an archive inventory, not a Vercel build or runtime qualification.
"""

from __future__ import annotations
import argparse
from email.parser import BytesParser
import hashlib
import json
from pathlib import Path
import re
import tomllib
import zipfile
from packaging.markers import default_environment
from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--backend-directory", type=Path, required=True)
parser.add_argument("--portfolio-directory", type=Path, default=Path("."))
parser.add_argument("--wheels", type=Path, required=True)
parser.add_argument("--model-snapshot", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
environment = {
    **default_environment(),
    "os_name": "posix",
    "sys_platform": "linux",
    "platform_system": "Linux",
    "platform_machine": "x86_64",
    "platform_release": "",
    "platform_version": "",
    "python_version": "3.12",
    "python_full_version": "3.12.13",
    "implementation_name": "cpython",
    "implementation_version": "3.12.13",
    "platform_python_implementation": "CPython",
    "extra": "",
}
lock = args.backend_directory / "requirements-runtime.lock"
selected, excluded = {}, []
for entry in re.sub(r"\\\r?\n", " ", lock.read_text()).splitlines():
    if not entry.strip() or entry.lstrip().startswith("#"):
        continue
    requirement = Requirement(entry.split("--hash=")[0].strip())
    if requirement.marker and not requirement.marker.evaluate(environment):
        excluded.append(str(requirement))
        continue
    selected[canonicalize_name(requirement.name)] = (
        requirement,
        set(re.findall(r"--hash=sha256:([a-f0-9]{64})", entry)),
    )
wheels = {}
for path in sorted(args.wheels.glob("*.whl")):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    with zipfile.ZipFile(path) as archive:
        names = [n for n in archive.namelist() if n.endswith(".dist-info/METADATA")]
        if len(names) != 1:
            raise ValueError("Wheel metadata is ambiguous")
        metadata = BytesParser().parsebytes(archive.read(names[0]))
        name = canonicalize_name(metadata["Name"])
        if name not in selected or name in wheels:
            raise ValueError(f"Unexpected or duplicate wheel: {name}")
        requirement, hashes = selected[name]
        if digest not in hashes or metadata["Version"] not in requirement.specifier:
            raise ValueError(f"Wheel differs from lock: {name}")
        wheels[name] = {
            "name": name,
            "version": metadata["Version"],
            "filename": path.name,
            "downloadBytes": path.stat().st_size,
            "uncompressedBytes": sum(i.file_size for i in archive.infolist()),
            "sha256": digest,
            "requirements": metadata.get_all("Requires-Dist", []),
        }
if set(wheels) != set(selected):
    raise ValueError(f"Missing selected wheels: {set(selected) - set(wheels)}")
project = tomllib.loads((args.backend_directory / "pyproject.toml").read_text())[
    "project"
]
queue = [
    Requirement(s)
    for s in project["dependencies"] + project["optional-dependencies"]["api"]
]
queue += [r for r, _ in selected.values()]
seen = set()
while queue:
    requirement = queue.pop()
    name = canonicalize_name(requirement.name)
    if name not in wheels or wheels[name]["version"] not in requirement.specifier:
        raise ValueError(f"Unsatisfied dependency: {requirement}")
    context = (name, tuple(sorted(requirement.extras)))
    if context in seen:
        continue
    seen.add(context)
    for text in wheels[name]["requirements"]:
        dependency = Requirement(text)
        if dependency.marker is None or any(
            dependency.marker.evaluate({**environment, "extra": e})
            for e in {""} | requirement.extras
        ):
            queue.append(dependency)
model_lock = json.loads((args.backend_directory / "model.lock.json").read_text())
model_files = []
for name, expected in model_lock["files"].items():
    data = (args.model_snapshot / name).read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != expected:
        raise ValueError(f"Model differs from lock: {name}")
    model_files.append({"filename": name, "bytes": len(data), "sha256": digest})


def total(directory, pattern):
    files = list(directory.rglob(pattern))
    if not files:
        raise ValueError(f"No files in {directory}")
    return sum(
        p.stat().st_size for p in files if p.is_file() and "__pycache__" not in p.parts
    )


result = {
    "schemaVersion": 2,
    "target": environment,
    "method": "Verify all downloaded wheel hashes against runtime lock and recursive dependency closure including API extras. Read uncompressed ZIP sizes without installation or execution.",
    "runtimeLockSha256": hashlib.sha256(lock.read_bytes()).hexdigest(),
    "wheels": list(wheels.values()),
    "excluded": excluded,
    "dependencyClosureFailures": [],
    "modelFiles": model_files,
    "sourceBytes": total(args.backend_directory / "src", "*"),
    "citedCorpusBytes": total(args.backend_directory / "content", "*"),
    "portfolioCorpusBytes": total(args.portfolio_directory / "content/assistant", "*"),
    "dependencyUncompressedBytes": sum(w["uncompressedBytes"] for w in wheels.values()),
    "modelBytes": sum(f["bytes"] for f in model_files),
    "status": "Measured archive footprint; not a Vercel build or Linux execution. Excludes generated vectors, bytecode, packaging metadata and Vercel wrapper/runtime overhead.",
}
result["combinedKnownBytes"] = sum(
    result[k]
    for k in [
        "sourceBytes",
        "citedCorpusBytes",
        "portfolioCorpusBytes",
        "dependencyUncompressedBytes",
        "modelBytes",
    ]
)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(
    json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n"
)
print(
    json.dumps({k: v for k, v in result.items() if k not in ["wheels", "modelFiles"]})
)
