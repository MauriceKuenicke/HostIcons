import json
from pathlib import Path


def test_icons_json_schema_and_paths():
    root = Path(__file__).resolve().parents[1]
    data_path = root / 'data' / 'icons.json'
    assert data_path.exists(), f"Missing data/icons.json at {data_path}"

    data = json.loads(data_path.read_text(encoding='utf-8'))
    assert isinstance(data, list), "icons.json must be a JSON array"

    allowed_themes = {"light", "dark"}
    for idx, entry in enumerate(data):
        assert isinstance(entry, dict), f"Entry {idx} must be an object"
        assert 'icn_name' in entry and isinstance(entry['icn_name'], str), f"Entry {idx} missing icn_name"
        assert 'icn_loc' in entry and isinstance(entry['icn_loc'], str), f"Entry {idx} missing icn_loc"
        assert 'theme' in entry and entry['theme'] in allowed_themes, f"Entry {idx} theme invalid"
        # file exists
        loc = entry['icn_loc']
        rel = loc[2:] if loc.startswith('./') else loc
        file_path = (root / rel).resolve()
        assert file_path.exists(), f"Missing icon file: {loc} -> {file_path}"
