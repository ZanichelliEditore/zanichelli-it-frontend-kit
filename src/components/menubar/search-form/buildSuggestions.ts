import { SearchSuggestion } from '../../../utils/types';

enum AREA_LABELS {
  SCUOLA = 'Scuola',
  UNIVERSITÀ = 'Università',
  GIURIDICO = 'Giuridico',
  DIZIONARI = 'Dizionari',
  SAGGISTICA = 'Saggistica',
}

export function buildSuggestions(
  query: string,
  subjectsMap: Record<string, string[]>,
  selectedArea?: string
): SearchSuggestion[] {
  const matchingSubjectAreas = findSubjectAreas(query, subjectsMap);
  const hasSubject = matchingSubjectAreas.length > 0;

  const suggestions: SearchSuggestion[] = [];

  if (selectedArea) suggestions.push(buildWordSuggestion(query, selectedArea));

  suggestions.push(buildWordSuggestion(query));

  if (hasSubject) {
    if (selectedArea) {
      const orderedSubjectAreas = [
        ...matchingSubjectAreas.filter((area) => area === selectedArea),
        ...matchingSubjectAreas.filter((area) => area !== selectedArea),
      ];
      orderedSubjectAreas.forEach((area) => suggestions.push(buildSubjectSuggestion(query, area)));
    } else {
      matchingSubjectAreas.forEach((subjectArea) => suggestions.push(buildSubjectSuggestion(query, subjectArea)));
    }
  }

  return suggestions;
}

const buildWordSuggestion = (query: string, area?: string): SearchSuggestion => {
  return {
    label: area
      ? `Cerca la parola ${query} nel catalogo ${AREA_LABELS[area]}`
      : `Cerca la parola ${query} in tutto il sito`,
    url: buildUrl({ q: query, ...(area ? { area } : {}), user_query: query }),
    details: { user_query: query, query, ...(area ? { area } : {}) },
  };
};

const buildSubjectSuggestion = (query: string, area: string): SearchSuggestion => {
  return {
    label: `Cerca la materia ${query} nel catalogo ${AREA_LABELS[area]}`,
    url: buildUrl({ area, materia: query.toUpperCase(), user_query: query }),
    details: { user_query: query, query, ...(area ? { area } : {}), subject: query.toUpperCase() },
  };
};

const buildUrl = (params: Record<string, string>): string => {
  return `/ricerca?${new URLSearchParams(params).toString()}`;
};

/** Find subject existing in areas */
function findSubjectAreas(query: string, subjectsMap: Record<string, string[]>): string[] {
  const normalizedQuery = normalized(query);
  return Object.entries(subjectsMap)
    .filter(([, subjects]) => subjects.some((subject) => normalized(subject) === normalizedQuery))
    .map(([area]) => area);
}

/** Clear search string: lowercase, remove multiple spaces, trim */
const normalized = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
