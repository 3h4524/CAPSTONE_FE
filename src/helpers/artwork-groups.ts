const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A group the application made is keyed by the id of the design (or product) its mock-ups show, which
// tells a person nothing, so those are numbered. A group the user named keeps its name.
export const artworkGroupLabel = (group: string, groups: string[]): string =>
  UUID_PATTERN.test(group) ? `Design ${groups.filter((item) => UUID_PATTERN.test(item)).indexOf(group) + 1}` : group;
