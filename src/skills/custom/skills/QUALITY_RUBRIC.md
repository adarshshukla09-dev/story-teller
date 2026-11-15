# Creative Quality Rubric

Score each dimension 1–10 using evidence from the actual package. A 9 or 10 is exceptional, not a compliance reward. Record a concise rationale and a concrete weakness for every score below 9.

| Dimension | 1–3 | 4–6 | 7–8 | 9–10 |
|---|---|---|---|---|
| Hook and curiosity | generic or misleading | relevant but weak question | specific, compelling open loop | instantly compelling, honest, precisely targeted |
| Narrative structure | disconnected | understandable but predictable/uneven | coherent progression | inevitable-feeling progression with earned turns |
| Central-idea clarity | unclear/multiple | partly clear | one clear takeaway | precise, simple, memorable without oversimplifying |
| Cause/effect progression | unsupported leaps | some links implied | links mostly explicit | every transition earns the next beat |
| Emotional engagement | inert or manipulative | occasional relevance | specific human stakes | emotionally resonant and proportionate |
| Analogy quality/fidelity | misleading | partial mapping | clarifies with limits | intuitive, elegant, faithful to mechanism |
| Visual storytelling | generic/repetitive | mixed depiction | purposeful and varied | visual proof, progression, and callback all work |
| Aha/payoff | absent/confusing | present but weak | clear and earned | reframes the opening with memorable clarity |
| Factual accuracy | material errors | weak sourcing/uncertainty | supported and qualified | robustly traceable, nuanced, limitations clear |
| Ending/memorability | abrupt/generic | resolves only loosely | satisfying | resolves opening and leaves a precise final image/thought |

Calculate the arithmetic mean across all ten dimensions; do not round up. Report one decimal place. If evidence is insufficient, mark the dimension `unscored` and do not fabricate a mean. Report technical compliance separately.

## Release gates
A technically valid package is not automatically creatively strong. Release requires:
- no serious factual error or unsupported certainty;
- no confusing or contradictory narrative progression;
- no materially broken analogy;
- no unresolved narrative setup;
- no major continuity error or unintentional visual contradiction;
- no deterministic structural validation blocker;
- no critical visual depiction failure.

An average of 8.5+ is the production quality target; 9+ is exceptional. These are targets for iterative development, not guaranteed results. If the average is below 8.5, report the score honestly and list the highest-leverage improvements. If the current QA JSON schema cannot store dimension scores, include them in the QA `summary`/report text; do not silently claim the machine-readable report contains fields it does not.


## Calibration examples
- **Below 7.0:** understandable or partially useful, but has a weak hook, missing mechanism, confusing progression, thin evidence, or unresolved payoff.
- **7.0–8.4:** solid and useful; most elements work, but one or more noticeable weaknesses prevent it from feeling distinctive, inevitable, or highly memorable.
- **8.5–8.9:** excellent and release-worthy; clear topic-fit hook, complete causal explanation, earned aha, purposeful visual progression, and satisfying payoff, with only minor weaknesses.
- **9.0–10:** exceptional; unusually precise and compelling, every major beat earns its place, visuals materially teach, and the ending transforms the opening without sacrificing nuance.

Do not award 8.5+ merely because the script obeys the schema. Score each dimension independently and cite package evidence. A weak hook, missing causal step, misleading analogy, or unsupported central claim cannot be offset by strong visuals or polished language.
