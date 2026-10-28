/** Sentence case for role labels, preserving filmmaking abbreviations. */
export function formatRole(value: string): string {
  return value.split("/").map((part) => {
    const role = part.trim();
    if (/^(DP|DOP|VFX|DIT|AC)$/i.test(role)) return role.toUpperCase();
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }).join(", ");
}
