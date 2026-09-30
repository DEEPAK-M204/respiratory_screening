import os
import sys
from pathlib import Path
import pandas as pd
import librosa

# Add backend directory to sys.path to import quality_assessor
DATA_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = DATA_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from app.rqa.quality_assessor import assess_quality
except ImportError:
    from quality_assessor import assess_quality



def process_split(csv_path, output_path):

    df = pd.read_csv(csv_path)

    results = []

    for idx, row in df.iterrows():

        filepath = row["filepath"]

        # Load ORIGINAL audio.
        # sr=None preserves the original sampling rate.
        y, sr = librosa.load(
            filepath,
            sr=None,
            mono=True
        )

        quality = assess_quality(y, sr)

        result = row.to_dict()
        result.update(quality)

        results.append(result)

        if (idx + 1) % 50 == 0:
            print(f"Processed {idx + 1}/{len(df)}")

    output_df = pd.DataFrame(results)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    output_df.to_csv(
        output_path,
        index=False
    )

    print(f"\nSaved: {output_path}")
    print(f"Rows: {len(output_df)}")


if __name__ == "__main__":
    splits_dir = DATA_DIR / "splits"
    quality_dir = DATA_DIR / "quality"

    for split in ["train", "val", "test"]:
        csv_file = splits_dir / f"{split}.csv"
        out_file = quality_dir / f"{split}_quality.csv"
        if csv_file.exists():
            process_split(str(csv_file), str(out_file))
        else:
            print(f"[skip] Split CSV not found: {csv_file}")