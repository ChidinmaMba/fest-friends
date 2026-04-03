/** Labels for stored race keys (must match server `RACE_VALUES`). */
export const RACE_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "american_indian_alaska_native", label: "American Indian or Alaska Native" },
  { value: "asian", label: "Asian" },
  { value: "black_african_american", label: "Black or African American" },
  { value: "hispanic_latino", label: "Hispanic or Latino" },
  { value: "native_hawaiian_pacific_islander", label: "Native Hawaiian or Pacific Islander" },
  { value: "white", label: "White" },
  { value: "mixed", label: "Mixed / multiple" },
  { value: "other", label: "Other" },
];

export const PERSONALITY_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "introvert", label: "Introvert" },
  { value: "extrovert", label: "Extrovert" },
  { value: "ambivert", label: "Kind of both" },
];

const raceLabelMap = Object.fromEntries(
  RACE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);
const personalityLabelMap = Object.fromEntries(
  PERSONALITY_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label])
);

export function formatRace(key) {
  return key ? raceLabelMap[key] || key : "";
}

export function formatPersonality(key) {
  return key ? personalityLabelMap[key] || key : "";
}
