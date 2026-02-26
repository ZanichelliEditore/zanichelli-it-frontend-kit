import { SearchSuggestion } from '../../../utils/types';

enum AREA_LABELS {
  SCUOLA = 'Scuola',
  UNIVERSITÀ = 'Università',
  GIURIDICO = 'Giuridico',
  DIZIONARI = 'Dizionari',
  SAGGISTICA = 'Saggistica',
}

const AREA_ORDER = Object.keys(AREA_LABELS);

export function buildSuggestions(
  query: string,
  subjectsByArea: Record<string, string[]>,
  selectedArea?: string
): SearchSuggestion[] {
  const matchingSubjectAreas = findSubjectAreas(query, subjectsByArea);
  const hasSubject = matchingSubjectAreas.length > 0;
  const subject = hasSubject ? query : undefined;

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

const buildWordSuggestion = (query: string, area?: string): SearchSuggestion => {
  return {
    label: area
      ? `Cerca la parola ${query} nel catalogo ${AREA_LABELS[area] ?? area}`
      : `Cerca la parola ${query} in tutto il sito`,
    url: buildUrl({ q: query, ...(area ? { area } : {}), user_query: query }),
    ...buildDetail(query, area),
  };
};

const buildSubjectSuggestion = (query: string, area: string, subject?: string): SearchSuggestion => {
  return {
    label: `Cerca la materia ${query} nel catalogo ${AREA_LABELS[area] ?? area}`,
    url: buildUrl({ area, materia: query.toUpperCase(), user_query: query }),
    ...buildDetail(query, area, subject.toUpperCase()),
  };
};

const buildUrl = (params: Record<string, string>): string => {
  return `ricerca?${new URLSearchParams(params).toString()}`;
};

const buildDetail = (query: string, area?: string, subject?: string) => ({
  user_query: query,
  query,
  ...(area ? { area } : {}),
  ...(subject ? { subject } : {}),
});

function findSubjectAreas(query: string, subjectsByArea: Record<string, string[]>): string[] {
  const cleanedQuery = cleanSearch(query);
  return Object.entries(subjectsByArea)
    .filter(([, subjects]) => subjects.some((subject) => subject.toLowerCase() === cleanedQuery))
    .map(([area]) => area);
}

/** Clear search string: lowercase, remove multiple spaces, trim */
const cleanSearch = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

const getAreaOrder = (area: string) => {
  const index = AREA_ORDER.indexOf(area);
  return index >= 0 ? index : 100;
};
