// import { SearchSuggestion } from '../../../utils/types';

import { SearchSuggestion } from '../../..';

const AREA_LABELS: Record<string, string> = {
  SCUOLA: 'Scuola',
  UNIVERSITÀ: 'Università',
  GIURIDICO: 'Giuridico',
  DIZIONARI: 'Dizionari',
  SAGGISTICA: 'Saggistica',
};

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

  const suggestions: SearchSuggestion[] = [];

  if (!hasSubject) {
    // Ricerca generica per parola chiave
    if (area) {
      // se esiste un area preselezionata
      suggestions.push(makeWordSuggestion(query, area));
    }
    // altrimenti mostro solo ricerca per parola chiave
    suggestions.push(makeWordSuggestion(query));
  } else {
    // se la parola esiste come materia in un area
    if (area) {
      // mostro la ricerca per materia in quell'area
      suggestions.push(makeWordSuggestion(query, area));
    } else {
      suggestions.push(makeWordSuggestion(query));
    }
  }

  console.log('suggestions:', suggestions);
  return suggestions;
}

export const makeWordSuggestion = (query: string, area?: string): SearchSuggestion => {
  const targetLabel = area ? AREA_LABELS[area] : undefined;

  console.log('target:', targetLabel);
  return {
    label: area ? `Cerca la parola ${query} nel catalogo ${targetLabel}` : `Cerca la parola ${query} in tutto il sito`,
    url: buildUrl({ q: query, ...(area ? { area } : {}), user_query: query }),
    details: { user_query: query, query, ...(area ? { area } : {}), subject: 'subject' },
  };
};

export const makeSubjectSuggestion = () => {};

export const buildUrl = (params: Record<string, string>): string => {
  return `/ricerca?${new URLSearchParams(params).toString()}`;
};
