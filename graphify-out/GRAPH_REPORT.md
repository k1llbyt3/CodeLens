# Graph Report - CodeLens  (2026-09-05)

## Corpus Check
- 34 files · ~257,680 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 69 nodes · 42 edges · 6 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]

## God Nodes (most connected - your core abstractions)
1. `handleKeyDown()` - 4 edges
2. `TraceResponse` - 3 edges
3. `Tracer` - 3 edges
4. `generate_trace()` - 2 edges
5. `CodeRequest` - 2 edges
6. `TraceStep` - 2 edges
7. `BubbleSort` - 2 edges
8. `Solution` - 2 edges
9. `TwoSum` - 2 edges
10. `handleRunTrace()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `generate_trace()` --calls--> `TraceResponse`  [INFERRED]
  backend\app\api\routes.py → backend\app\models\schemas.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.38
Nodes (5): generate_trace(), BaseModel, CodeRequest, TraceResponse, TraceStep

### Community 1 - "Community 1"
Cohesion: 0.43
Nodes (4): handleKeyDown(), handleRunTrace(), handleTogglePlay(), isInputOrEditor()

### Community 2 - "Community 2"
Cohesion: 0.67
Nodes (1): Tracer

### Community 5 - "Community 5"
Cohesion: 0.67
Nodes (1): BubbleSort

### Community 6 - "Community 6"
Cohesion: 0.67
Nodes (1): Solution

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (1): TwoSum

## Knowledge Gaps
- **Thin community `Community 2`** (4 nodes): `Tracer.java`, `Tracer`, `.formatValue()`, `.main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (3 nodes): `BubbleSort.java`, `BubbleSort`, `.main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (3 nodes): `Solution.java`, `Solution`, `.main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (3 nodes): `TwoSum.java`, `TwoSum`, `.main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Not enough signal to generate questions. This usually means the corpus has no AMBIGUOUS edges, no bridge nodes, no INFERRED relationships, and all communities are tightly cohesive. Add more files or run with --mode deep to extract richer edges._