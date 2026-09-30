"""
Runs feature extraction over every file in a Phase 7 *_processed.csv, saves
each clip's features as a single .npz (mel spectrogram + scalar features
together, per the "combine data updated together" principle), and writes a
new CSV pointing at the .npz files for Phase 10 to load directly.
"""
import os
import sys
import csv
import argparse
from pathlib import Path
import numpy as np
import librosa

DATA_DIR = Path(__file__).resolve().parent
if str(DATA_DIR) not in sys.path:
    sys.path.insert(0, str(DATA_DIR))

from feature_extractor import extract_features



def process_split(csv_path: str, processed_root: str, features_root: str, out_csv_path: str):
    rows_out = []
    skipped = 0

    with open(csv_path, newline="") as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        src_path = row["filepath"]
        try:
            y, sr = librosa.load(src_path, sr=None, mono=True)
            features = extract_features(y, sr)
        except Exception as e:
            print(f"  [warn] failed on {src_path}: {e} -- skipping")
            skipped += 1
            continue

        rel_path = os.path.relpath(src_path, processed_root)
        out_path = os.path.join(features_root, os.path.splitext(rel_path)[0] + ".npz")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        np.savez_compressed(
            out_path,
            mel_spectrogram=features["mel_spectrogram"],
            zcr_mean=features["zcr_mean"], zcr_std=features["zcr_std"],
            centroid_mean=features["centroid_mean"], centroid_std=features["centroid_std"],
            rms_mean=features["rms_mean"], rms_std=features["rms_std"],
        )

        new_row = dict(row)
        new_row["feature_path"] = out_path
        rows_out.append(new_row)

    if rows_out:
        with open(out_csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()))
            writer.writeheader()
            writer.writerows(rows_out)

    print(f"  {len(rows_out)} processed, {skipped} skipped -> {out_csv_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--splits_dir', default='data/splits')
    parser.add_argument('--processed_root', default='data/processed')
    parser.add_argument('--features_root', default='data/features')
    args = parser.parse_args()

    splits_dir = args.splits_dir
    processed_root = args.processed_root
    features_root = args.features_root

    # Fallback to local data dir if run from inside data/
    if not os.path.exists(splits_dir):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        alt_splits = os.path.join(script_dir, "splits")
        if os.path.exists(alt_splits):
            splits_dir = alt_splits
            processed_root = os.path.join(script_dir, "processed")
            features_root = os.path.join(script_dir, "features")

    for split_name in ['train', 'val', 'test']:
        csv_path = os.path.join(splits_dir, f'{split_name}_processed.csv')
        if not os.path.exists(csv_path):
            print(f'[skip] {csv_path} not found')
            continue
        print(f'Extracting features for {split_name}...')
        out_csv_path = os.path.join(splits_dir, f'{split_name}_features.csv')
        process_split(csv_path, processed_root, features_root, out_csv_path)


if __name__ == '__main__':
    main()
