# FINAL PRODUCTION QA

## Response Requirements

You MUST return valid JSON only.

Do not return Markdown code fences.
Do not include explanations outside the JSON object.

## Required JSON Structure

{
"status": "approved",
"issues": []
}

When production requires corrections, return:

{
"status": "revision_required",
"issues": [
{
"sceneId": 5,
"artifact": "svg",
"severity": "major",
"category": "missing_detail",
"description": "The Update Available icon is missing its white exclamation mark.",
"correction": "Add the missing exclamation mark."
}
]
}

## Allowed Status Values

- approved
- revision_required

## QA Responsibilities

Evaluate every scene for:

1. SVG validity.
2. Character proportions.
3. Character consistency.
4. Illustration quality.
5. Background and environmental details.
6. Props and missing details.
7. Typography.
8. Scene composition.
9. Visual continuity.
10. Compliance with SVG Illustrator Skill.

## Approval Rules

Return "approved" only when all required checks pass.

Return "revision_required" when one or more required checks fail.

Every issue must include:

- sceneId
- artifact
- severity
- category
- description
- correction

Do not invent problems.
Do not flag features that are permitted by the SVG Illustrator Skill.
