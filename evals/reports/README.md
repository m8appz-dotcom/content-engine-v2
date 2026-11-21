# Evaluation reports

`archive/2026-06-02.json` preserves the historical 5/6 result without presenting it as current.

`npm run eval` writes an actual, timestamped result to ignored `current.json`. The CI workflow publishes that file as an artifact for the exact tested commit. See the latest successful run from the repository Actions page; an archived report is not a current result or a live-provider quality benchmark.
