"""
RespiratoryCNNBiLSTM Neural Network Architecture.

Combines 2D CNN layers over Log-Mel Spectrograms with a Bidirectional LSTM
(concatenating forward and backward final hidden states), fused with standardized acoustic scalar
features (ZCR, Spectral Centroid, RMS Energy statistics) for multi-class respiratory disease classification.
"""
import torch
import torch.nn as nn


class RespiratoryCNNBiLSTM(nn.Module):
    def __init__(self, num_classes: int = 5, num_scalars: int = 6):
        super().__init__()
        self.num_classes = num_classes
        self.num_scalars = num_scalars

        # 2D CNN feature extractor for Log-Mel Spectrograms
        self.conv = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),
        )

        # Bidirectional LSTM to capture temporal dynamics across spectrogram frames
        # 32 channels * 16 frequency bands = 512 input features per time step
        self.lstm = nn.LSTM(
            input_size=32 * 16,
            hidden_size=64,
            batch_first=True,
            bidirectional=True,
        )

        # Fusion classifier combining BiLSTM features (128) + scalar features (6) = 134
        self.classifier = nn.Sequential(
            nn.Linear(128 + num_scalars, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes),
        )

    def forward(self, mel: torch.Tensor, scalars: torch.Tensor) -> torch.Tensor:
        """
        Args:
            mel: Tensor of shape (Batch, 1, 64, Time) representing Log-Mel Spectrogram.
            scalars: Tensor of shape (Batch, 6) representing standardized scalar features.
        Returns:
            Logits tensor of shape (Batch, num_classes).
        """
        x = self.conv(mel)
        batch_size, channels, freq, time_steps = x.shape
        x = x.permute(0, 3, 1, 2).contiguous().view(batch_size, time_steps, channels * freq)

        lstm_out, (h_n, _) = self.lstm(x)

        forward_final = h_n[0]
        backward_final = h_n[1]

        lstm_summary = torch.cat([forward_final, backward_final], dim=1)

        feat = torch.cat([lstm_summary, scalars], dim=1)
        return self.classifier(feat)
