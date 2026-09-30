"""
Phase 9 — Dataset preparation for Asthma Detection Dataset V2 (primary source).

Assumed layout (matches the REAL downloaded folder names):
    data/raw/asthma_detection_v2/
        asthma/*.wav
        Bronchial/*.wav
        copd/*.wav
        healthy/*.wav
        pneumonia/*.wav
"""
import os
import csv
import argparse
from collections import defaultdict

from sklearn.model_selection import GroupShuffleSplit

CLASS_FOLDERS = {
    "asthma": "Asthma",
    "Bronchial": "Bronchial",
    "copd": "COPD",
    "healthy": "Normal",
    "pneumonia": "Pneumonia",
}


def load_dataset(raw_dir: str) -> list:
    rows = []
    for folder_name, label in CLASS_FOLDERS.items():
        class_dir = os.path.join(raw_dir, folder_name)
        if not os.path.isdir(class_dir):
            print(f"  [warn] {class_dir} not found -- skipping this class")
            continue
        for fname in sorted(os.listdir(class_dir)):
            if not fname.lower().endswith(".wav"):
                continue
            stem = os.path.splitext(fname)[0]
            rows.append({
                "filepath": os.path.join(class_dir, fname),
                "group_id": f"{folder_name}_{stem}",
                "label": label,
                "source": "asthma_detection_v2",
                "device_type": "smartphone_mic",
            })
    return rows


def group_level_split(rows, val_size, test_size, seed):
    group_ids = [r["group_id"] for r in rows]
    gss1 = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=seed)
    trainval_idx, test_idx = next(gss1.split(rows, groups=group_ids))
    trainval_rows = [rows[i] for i in trainval_idx]
    test_rows = [rows[i] for i in test_idx]

    trainval_ids = [r["group_id"] for r in trainval_rows]
    relative_val = val_size / (1 - test_size)
    gss2 = GroupShuffleSplit(n_splits=1, test_size=relative_val, random_state=seed)
    train_idx, val_idx = next(gss2.split(trainval_rows, groups=trainval_ids))
    return [trainval_rows[i] for i in train_idx], [trainval_rows[i] for i in val_idx], test_rows


def assert_no_group_overlap(train_rows, val_rows, test_rows):
    train_g = {r["group_id"] for r in train_rows}
    val_g = {r["group_id"] for r in val_rows}
    test_g = {r["group_id"] for r in test_rows}
    assert not (train_g & val_g)
    assert not (train_g & test_g)
    assert not (val_g & test_g)


def write_csv(rows, path):
    if not rows:
        print(f"  [warn] no rows to write for {path}")
        return
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["filepath", "group_id", "label", "source", "device_type"])
        w.header = True
        w.writeheader()
        w.writerows(rows)


def print_distribution(name, rows):
    by_label = defaultdict(int)
    for r in rows:
        by_label[r["label"]] += 1
    print(f"\n{name} ({len(rows)} recordings):")
    for label in sorted(by_label):
        print(f"  {label}: {by_label[label]}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--raw_dir", default="data/raw/asthma_detection_v2")
    parser.add_argument("--out_dir", default="data/splits")
    parser.add_argument("--val_size", type=float, default=0.15)
    parser.add_argument("--test_size", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    # If raw_dir does not exist relative to cwd, try relative to script location
    raw_dir = args.raw_dir
    out_dir = args.out_dir
    if not os.path.exists(raw_dir):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        alt_raw = os.path.join(script_dir, "raw", "asthma_detection_v2")
        if os.path.exists(alt_raw):
            raw_dir = alt_raw
            out_dir = os.path.join(script_dir, "splits")

    print(f"Loading Asthma Detection Dataset V2 from {raw_dir}")
    rows = load_dataset(raw_dir)
    print(f"  {len(rows)} recordings loaded across {len(CLASS_FOLDERS)} classes")
    if not rows:
        print("\nNo data loaded -- check --raw_dir and folder names.")
        return

    train_rows, val_rows, test_rows = group_level_split(rows, args.val_size, args.test_size, args.seed)
    assert_no_group_overlap(train_rows, val_rows, test_rows)

    os.makedirs(out_dir, exist_ok=True)
    write_csv(train_rows, os.path.join(out_dir, "train.csv"))
    write_csv(val_rows, os.path.join(out_dir, "val.csv"))
    write_csv(test_rows, os.path.join(out_dir, "test.csv"))

    print_distribution("TRAIN", train_rows)
    print_distribution("VAL", val_rows)
    print_distribution("TEST", test_rows)
    print("\nNo group overlap between splits: confirmed.")
    print(f"CSVs written to {out_dir}/")


if __name__ == "__main__":
    main()
