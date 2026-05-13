import glob
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "packages" / "shared" / "src" / "skills" / "generatedSkillCatalog.ts"
NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

PINNED_IDS = {
    "火焰刀": "huo_yan_dao",
    "朱雀羽扇": "zhu_que_yu_shan",
}


def main() -> None:
    source = resolve_source()
    rows = read_first_sheet(source)
    if not rows:
        raise SystemExit(f"No rows found in {source}")

    skills = normalize_rows(rows)
    OUT.write_text(render_ts(skills, source.name), encoding="utf-8")
    print(f"Imported {len(skills)} skills from {source} -> {OUT}")


def resolve_source() -> Path:
    if len(sys.argv) > 1:
        pattern = sys.argv[1]
        matches = sorted(Path(item) for item in glob.glob(pattern))
        if not matches and Path(pattern).exists():
            matches = [Path(pattern)]
        if matches:
            return matches[0]
        raise SystemExit(f"No .xlsx skill file matched {pattern}")

    files = sorted(ROOT.glob("*.xlsx"))
    if not files:
        raise SystemExit("No .xlsx skill file found in project root")
    return files[0]


def normalize_rows(rows: list[tuple[int, list[str]]]) -> list[dict]:
    header = rows[0][1]
    if "技能名字" in header and "技能效果" in header:
        name_index = header.index("技能名字")
        timing_index = header.index("生效时间") if "生效时间" in header else -1
        effect_index = header.index("技能效果")
        tag_index = header.index("特殊标签") if "特殊标签" in header else -1

        skills = []
        for row_number, row in rows[1:]:
            name = cell(row, name_index)
            if not name:
                continue

            skills.append(
                {
                    "id": skill_id(name, row_number),
                    "name": name,
                    "fusion": "",
                    "timing": cell(row, timing_index),
                    "description": cell(row, effect_index),
                    "tags": split_tags(cell(row, tag_index)),
                    "sourceRow": row_number,
                }
            )
        return skills

    skills = []
    for row_number, row in rows[1:]:
        name = cell(row, 1)
        if not name:
            continue

        skills.append(
            {
                "id": skill_id(name, row_number),
                "name": name,
                "fusion": cell(row, 2),
                "timing": "",
                "description": cell(row, 3),
                "tags": split_tags(cell(row, 4)),
                "sourceRow": row_number,
            }
        )
    return skills


def read_first_sheet(path: Path) -> list[tuple[int, list[str]]]:
    with zipfile.ZipFile(path) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        shared = read_shared_strings(archive)
        first_sheet = workbook.find("a:sheets/a:sheet", NS)
        if first_sheet is None:
            return []

        rid = first_sheet.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        target = relmap[rid]
        sheet_path = "xl/" + target.lstrip("/")
        sheet = ET.fromstring(archive.read(sheet_path))
        rows = []
        for row_node in sheet.findall(".//a:sheetData/a:row", NS):
            values: list[str] = []
            for col in row_node.findall("a:c", NS):
                index = column_index(col.attrib.get("r", ""))
                while len(values) <= index:
                    values.append("")
                values[index] = read_cell(col, shared)
            if any(value.strip() for value in values):
                rows.append((int(row_node.attrib.get("r", len(rows) + 1)), values))
        return rows


def column_index(reference: str) -> int:
    match = re.match(r"([A-Z]+)", reference)
    if not match:
        return 0

    value = 0
    for char in match.group(1):
        value = value * 26 + ord(char) - ord("A") + 1
    return value - 1


def read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []

    shared_xml = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values = []
    for item in shared_xml.findall("a:si", NS):
        values.append(
            "".join(
                text.text or ""
                for text in item.iter(
                    "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
                )
            )
        )
    return values


def read_cell(cell_node: ET.Element, shared: list[str]) -> str:
    value = cell_node.find("a:v", NS)
    cell_type = cell_node.attrib.get("t")
    if value is not None:
        raw = value.text or ""
        if cell_type == "s" and raw.isdigit():
            index = int(raw)
            return shared[index] if index < len(shared) else raw
        return raw

    if cell_type == "inlineStr":
        inline = cell_node.find("a:is", NS)
        if inline is None:
            return ""
        return "".join(
            text.text or ""
            for text in inline.iter(
                "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"
            )
        )

    return ""


def cell(row: list[str], index: int) -> str:
    if index < 0 or index >= len(row):
        return ""
    return row[index].strip()


def split_tags(raw: str) -> list[str]:
    return [tag.strip() for tag in re.split(r"[,，、/;；\n]", raw) if tag.strip()]


def skill_id(name: str, row_number: int) -> str:
    if name in PINNED_IDS:
        return PINNED_IDS[name]

    seed = f"{name}:{row_number}".encode("utf-8")
    checksum = 0
    for byte in seed:
        checksum = (checksum * 131 + byte) % 100000
    return f"skill_{row_number}_{checksum}"


def render_ts(skills: list[dict], source_name: str) -> str:
    payload = json.dumps(skills, ensure_ascii=False, indent=2)
    return (
        'import { RawSkillDefinition } from "./types";\n\n'
        f"// Auto-generated by scripts/import-skills.py from {source_name}.\n"
        "export const RAW_SKILL_CATALOG: RawSkillDefinition[] = "
        f"{payload};\n"
    )


if __name__ == "__main__":
    main()
