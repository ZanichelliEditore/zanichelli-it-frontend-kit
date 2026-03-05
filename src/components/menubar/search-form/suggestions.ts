enum AREA_LABELS {
  SCUOLA = 'Scuola',
  UNIVERSITÀ = 'Università',
  GIURIDICO = 'Giuridico',
  DIZIONARI = 'Dizionari',
  SAGGISTICA = 'Saggistica',
}

const AREA_ORDER = Object.keys(AREA_LABELS);

export type SearchSuggestion = {
  id: string;
  label: string;
  html_label: string;
  url: string;
  user_query: string;
  query?: string;
  area?: string;
  subject?: string;
};

export function buildSuggestions(
  query: string,
  subjectsByArea: Record<string, string[]>,
  selectedArea?: string
): SearchSuggestion[] {
  const matchingSubjectAreas = findSubjectAreas(query, subjectsByArea);
  const hasSubject = matchingSubjectAreas.length > 0;
  const subject = hasSubject ? query.toUpperCase() : undefined;

  const suggestions: SearchSuggestion[] = [];

  if (selectedArea) suggestions.push(buildWordSuggestion(query, selectedArea));

  suggestions.push(buildWordSuggestion(query));

  if (hasSubject) {
    if (selectedArea) {
      const orderedSubjectAreas = [
        ...matchingSubjectAreas.filter((area) => area === selectedArea),
        ...matchingSubjectAreas
          .filter((area) => area !== selectedArea)
          .sort((a, b) => getAreaOrder(a) - getAreaOrder(b)),
      ];
      orderedSubjectAreas.forEach((area) => suggestions.push(buildSubjectSuggestion(query, area, subject)));
    } else {
      matchingSubjectAreas
        .sort((a, b) => getAreaOrder(a) - getAreaOrder(b))
        .forEach((subjectArea) => suggestions.push(buildSubjectSuggestion(query, subjectArea, subject)));
    }
  }

  return suggestions;
}

const buildWordSuggestion = (user_query: string, area?: string): SearchSuggestion => {
  return {
    id: buildId(`word-${user_query}-${area}`),
    label: buildLabel(user_query, area, false, false),
    html_label: buildLabel(user_query, area, false, true),
    url: buildUrl({ q: user_query, ...(area ? { area } : {}), user_query }),
    ...buildDetail(user_query, user_query, area),
  };
};

const buildSubjectSuggestion = (user_query: string, area: string, subject: string): SearchSuggestion => {
  return {
    id: buildId(`subj-${user_query}-${area}-${subject}`),
    label: buildLabel(user_query, area, true, false),
    html_label: buildLabel(user_query, area, true, true),
    url: buildUrl({ area, materia: subject, user_query }),
    ...buildDetail(user_query, undefined, area, subject),
  };
};

const buildId = (string: string) =>
  string
    .split('')
    .map((c) => c.charCodeAt(0).toString(16))
    .join('');

const buildUrl = (params: Record<string, string>): string => {
  return `ricerca?${new URLSearchParams(params).toString()}`;
};

const buildDetail = (user_query: string, query?: string, area?: string, subject?: string) => ({
  user_query,
  ...(query ? { query } : {}),
  ...(area ? { area } : {}),
  ...(subject ? { subject } : {}),
});

const buildLabel = (user_query: string, area?: string, isSubject: boolean = false, isHtml: boolean = false) => {
  const openStrong = isHtml ? `<strong>` : ``;
  const closeStrong = isHtml ? `</strong>` : ``;

  return `Cerca la ${isSubject ? `materia` : `parola`} ${openStrong}${user_query}${closeStrong} ${area ? `nel catalogo ${openStrong}${AREA_LABELS[area] ?? area}` : `in tutto il sito`}${closeStrong}`;
};

function findSubjectAreas(query: string, subjectsByArea: Record<string, string[]>): string[] {
  const cleanedQuery = cleanSearch(query);
  return Object.entries(subjectsByArea)
    .filter(([, subjects]) => subjects.some((subject) => subject.toLowerCase() === cleanedQuery))
    .map(([area]) => area);
}

/** Clear search string: lowercase, remove multiple spaces */
const cleanSearch = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

const getAreaOrder = (area: string) => {
  const index = AREA_ORDER.indexOf(area);
  return index >= 0 ? index : 100;
};
