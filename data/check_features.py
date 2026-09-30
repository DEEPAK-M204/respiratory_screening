import csv
import numpy as np
from collections import defaultdict

by_label = defaultdict(lambda: defaultdict(list))

with open("data/splits/train_features.csv") as f:
    for row in csv.DictReader(f):
        lbl = row["label"]
        d = np.load(row["feature_path"])
        by_label[lbl]["zcr"].append(float(d["zcr_mean"]))
        by_label[lbl]["centroid"].append(float(d["centroid_mean"]))
        by_label[lbl]["rms"].append(float(d["rms_mean"]))

print("--- Mean scalar features across classes on TRAIN split ---")
for lbl, metrics in sorted(by_label.items()):
    n = len(metrics["zcr"])
    zcr = np.mean(metrics["zcr"])
    cent = np.mean(metrics["centroid"])
    rms = np.mean(metrics["rms"])
    print(f"{lbl:10s} (N={n:3d}): ZCR={zcr:.4f} | Centroid={cent:.1f} Hz | RMS={rms:.4f}")
