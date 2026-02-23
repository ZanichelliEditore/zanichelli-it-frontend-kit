const SUBJECTS_URL: Record<string, string> = {
  test: 'https://zanichelli-shop-test.s3.eu-west-1.amazonaws.com',
  prod: 'https://zanichelli-shop.s3.eu-west-1.amazonaws.com',
};

export async function getSubjectsByArea(searchSuggestionEnv: string): Promise<Record<string, string[]>> {
  try {
    const response = await fetch(`${SUBJECTS_URL[searchSuggestionEnv]}/categories.json`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('Error fetching subjects:', err);
    return {};
  }
}
