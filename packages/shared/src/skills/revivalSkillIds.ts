/** Direct revival effects, including a card clause that also has unrelated effects. */
export const SMALL_REVIVAL_SKILLS = new Set(["1063", "1064", "1065", "1067", "1068", "1111"]);
export const REVIVAL_FUSION_NAMES = new Set(["贤者的庇护"]);
export const BIG_REVIVAL_SKILLS = new Set([
  "1050203", "1050206", "1051303", "1052006", "1052201", "1054208", "1054614", "1054903", "1054904",
  "1060202", "1060205", "1061702", "1062407", "1062907", "1063710", "1064302", "1065205",
  "1071402", "1071702", "1072901", "1072904", "1074106", "1074305", "1074502",
  "1080401", "1080505", "1081404", "1082303", "2080604", "2081505", "2081706", "2082203", "2090606"
]);

export function prefixRevivalDescription(description: string): string {
  return description.startsWith("复活技") ? description : `复活技。${description}`;
}
