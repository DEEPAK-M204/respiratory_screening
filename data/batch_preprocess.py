"""
Runs the preprocessing pipeline over every file listed in a Phase 9 split CSV.
"""
import os
import sys
import csv
import argparse
from pathlib import Path
import soundfile as sf
import librosa

DATA_DIR = Path(__file__).resolve().parent
if str(DATA_DIR) not in sys.path:
    sys.path.insert(0, str(DATA_DIR))

from audio_preprocessor import preprocess



def process_split(csv_path, raw_root, processed_root, out_csv_path):
    rows_out = []
    skipped = 0

    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for row in rows:
        src_path = row["filepath"]
        try:
            y, sr = librosa.load(src_path, sr=None, mono=True)
            y_clean, sr_clean = preprocess(y, sr)
        except Exception as e:
            print(f"  [warn] failed on {src_path}: {e} -- skipping")
            skipped += 1
            continue

        rel_path = os.path.relpath(src_path, raw_root)
        out_path = os.path.join(processed_root, rel_path)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        sf.write(out_path, y_clean, sr_clean)

        new_row = dict(row)
        new_row["filepath"] = out_path
        rows_out.append(new_row)

    if rows_out:
        with open(out_csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=rows_out[0].keys())
            writer.writeheader()
            writer.writerows(rows_out)

    print(f"  {len(rows_out)} processed, {skipped} skipped -> {out_csv_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--splits_dir", default="data/splits")
    parser.add_argument("--raw_root", default="data/raw")
    parser.add_argument("--processed_root", default="data/processed")
    args = parser.parse_args()

    splits_dir = args.splits_dir
    raw_root = args.raw_root
    processed_root = args.processed_root

    # Fallback to local data dir if run from inside data/
    if not os.path.exists(splits_dir):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        alt_splits = os.path.join(script_dir, "splits")
        if os.path.exists(alt_splits):
            splits_dir = alt_splits
            raw_root = os.path.join(script_dir, "raw")
            processed_root = os.path.join(script_dir, "processed")

    for split_name in ["train", "val", "test"]:
        csv_path = os.path.join(splits_dir, f"{split_name}.csv")
        if not os.path.exists(csv_path):
            print(f"[skip] {csv_path} not found")
            continue
        print(f"Processing {split_name}...")
        out_csv_path = os.path.join(splits_dir, f"{split_name}_processed.csv")
        process_split(csv_path, raw_root, processed_root, out_csv_path)


if __name__ == "__main__":
    main()
