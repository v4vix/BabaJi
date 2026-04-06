# Demo Mode

## End-to-end local demo
1. Start services with `bash scripts/run.sh`.
2. Upload a sample document from web `/admin` page or KB upload endpoint.
3. Generate kundli report from `/kundli`.
4. Queue kundli/vaastu video jobs using video endpoints.
5. Generate vaastu report from `/vaastu`.
6. Start consented consult session from `/consult`.

## Expected outputs
- Citation-aware kundli response mode.
- Vaastu report markdown with safety checklist.
- Video jobs queued with IDs.
- Consult session created with RTC URL.
