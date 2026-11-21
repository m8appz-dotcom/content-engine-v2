export const source =
  "# Architecture\n\nContent Engine v2 is a clean-room rebuild of the original content pipeline.\n\n## Pipeline\n\nSource Registry → Evidence → Story angles → Script → Validation → Human approval → Rendering\n\nModel output is validated before it is written to the database. Public examples use allowlisted evidence. Human approval remains a separate decision.\n\nThis excerpt summarizes the public architecture for the interactive English example. It is not a record of a completed publication.";
export const stories = [
  {
    id: "evidence-story",
    title: "From real evidence to a story worth sharing",
    hook: "Before you believe this video, look at the evidence.",
    script:
      "Before you believe this video, look at the evidence. This example starts with the architecture that supports the story. The source makes one detail visible: model output is validated before it enters the database. That gives the claim something a reviewer can inspect. Next, turn the evidence into a clear story for a business audience. The script still needs a human decision. Review the claims, approve the draft, and check the storyboard before moving to a render.",
    claim: "Model output is validated before it is written to the database.",
    evidence:
      "The public architecture places validation before the database write.",
    shots: [
      "Show the architecture excerpt and the source filename.",
      "Trace the claim to its supporting passage.",
      "Show the approved draft beside the storyboard.",
    ],
  },
  {
    id: "claims-story",
    title: "A content pipeline that makes claims reviewable",
    hook: "A convincing line still needs evidence.",
    script:
      "A convincing line still needs evidence. This example links a script claim to a readable source. The reviewer can compare the wording with the architecture, revise an overstatement, and decide whether the line belongs in the story. The pipeline separates validation from approval. Passing a check does not replace a human decision. Keep the source close to the draft so the next reviewer can follow the same reasoning.",
    claim: "Validation and human approval are separate steps.",
    evidence:
      "The example pipeline lists validation followed by human approval.",
    shots: [
      "Read the claim in the draft.",
      "Compare the claim with the pipeline steps.",
      "Record the review decision and its revision.",
    ],
  },
  {
    id: "business-story",
    title: "Turn technical work into a useful business story",
    hook: "Start with work you can actually show.",
    script:
      "Start with work you can actually show. A small, reproducible example gives a business audience something concrete to inspect. Choose a public source, explain the change in plain language, and connect each claim to evidence. Keep the story focused on what the example demonstrates. Avoid promising results that have not been measured. The final decision stays with the person reviewing the script and its supporting material.",
    claim: "The example uses public, allowlisted evidence.",
    evidence:
      "The source summary limits this example to public, allowlisted material.",
    shots: [
      "Identify the public source.",
      "Show the supported change in plain language.",
      "Close with the decision the example helps a reviewer make.",
    ],
  },
];
