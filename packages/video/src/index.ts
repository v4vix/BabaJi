export type VideoScene = {
  id: string;
  title: string;
  narration: string;
  durationSec: number;
};

export function buildVaastuScenes(summary: string): VideoScene[] {
  return [
    {
      id: "intro",
      title: "Vaastu Walkthrough",
      narration: "This report is informational. Consult licensed professionals for structural changes.",
      durationSec: 8,
    },
    {
      id: "summary",
      title: "Key Observations",
      narration: summary,
      durationSec: 16,
    },
  ];
}

export function ffmpegConcatHint(files: string[], out: string): string {
  return `ffmpeg -y ${files.map((f) => `-i ${f}`).join(" ")} -filter_complex concat=n=${files.length}:v=1:a=1 ${out}`;
}
