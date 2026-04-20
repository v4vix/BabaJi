from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RenderPlan:
    topic: str
    narration_wav: str
    output_mp4: str

    def ffmpeg_cmd(self) -> list[str]:
        return [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            "assets/default-background.png",
            "-i",
            self.narration_wav,
            "-shortest",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            self.output_mp4,
        ]
