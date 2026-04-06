export function renderVaastuReportHtml(input: {
  profileId: string;
  summary: string;
  checklist: string[];
  disclaimers: string[];
}): string {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Vaastu Report</title></head>
  <body style="font-family: Georgia, serif; padding: 24px; color: #1f2933;">
    <h1>Vaastu Report</h1>
    <p><strong>Profile:</strong> ${input.profileId}</p>
    <p>${input.summary}</p>
    <h2>Checklist</h2>
    <ul>${input.checklist.map((item) => `<li>${item}</li>`).join("")}</ul>
    <h2>Disclaimers</h2>
    <ul>${input.disclaimers.map((item) => `<li>${item}</li>`).join("")}</ul>
  </body>
</html>`;
}

export function renderKundliInsightCard(input: { title: string; body: string }): string {
  return `<div style="border:1px solid #ddd;padding:16px;border-radius:16px"><h3>${input.title}</h3><p>${input.body}</p></div>`;
}
