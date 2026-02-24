import { SearchSuggestion } from '../../../utils/types';

export enum AREA_LABELS {
  SCUOLA = 'Scuola',
  UNIVERSITÀ = 'Università',
  GIURIDICO = 'Giuridico',
  DIZIONARI = 'Dizionari',
  SAGGISTICA = 'Saggistica',
}

/** Find subject existing in areas */
export function findSubjectAreas(query: string, subjectsMap: Record<string, string[]>): string[] {
  console.log('findSubjectAreas:', subjectsMap);
  return Object.entries(subjectsMap)
    .filter(([, subjects]) => subjects.some((subject) => normalize(subject) === normalize(query)))
    .map(([area]) => area);
}

/** Normalize a string to lowercase, replacing multiple spaces with a single space, and trimming. */
export const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function buildSuggestions(
  query: string,
  subjectsMap: Record<string, string[]>,
  area?: string
): SearchSuggestion[] {
  console.log('buildSuggestions:', query);
  const getSubjectExistingAreas = findSubjectAreas(query, subjectsMap);
  const hasSubject = getSubjectExistingAreas.length > 0;
  // const subject = hasSubject ? query : undefined;

  const suggestions: SearchSuggestion[] = [];

  if (!hasSubject) {
    // Ricerca generica per parola chiave
    if (area) {
      // se esiste un area preselezionata
      suggestions.push(buildWordSuggestion(query, area));
    }
    // altrimenti mostro solo ricerca per parola chiave
    suggestions.push(buildWordSuggestion(query));
  } else {
    // // se la ricerca esiste come materia in un area
    if (area) {
      //     // mostro la ricerca per materia in quell'area
      console.log('subject exists in area, build subject suggestion for area:', area);
      suggestions.push(buildSubjectSuggestion(query, area));
    } else {
      //     suggestions.push(makeWordSuggestion(query, subject));
    }
  }

  console.log('suggestions:', suggestions);
  return suggestions;
}

export const buildWordSuggestion = (query: string, area?: string, subject?: string): SearchSuggestion => {
  return {
    label: area
      ? `Cerca la parola ${query} nel catalogo ${AREA_LABELS[area]}`
      : `Cerca la parola ${query} in tutto il sito`,
    url: buildUrl({ q: query, ...(area ? { area } : {}), user_query: query }),
    details: { user_query: query, query, ...(area ? { area } : {}), ...(subject ? { subject } : {}) },
  };
};

export const buildSubjectSuggestion = (query: string, area: string): SearchSuggestion => {
  return {
    label: `Cerca la materia ${query} nel catalogo ${AREA_LABELS[area]}`,
    url: buildUrl({ area, materia: query.toUpperCase(), user_query: query }),
    details: { user_query: query, query, area, subject: query },
  };
};

export const buildUrl = (params: Record<string, string>): string => {
  return `/ricerca?${new URLSearchParams(params).toString()}`;
};
