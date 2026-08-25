const API_BASE = "/api/movies";

export async function fetchMovies({ seed, page, lang, likes, reviews }) {
  const params = new URLSearchParams({
    seed: String(seed),
    page: String(page),
    lang,
    likes: String(likes),
    reviews: String(reviews),
  });

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to load movies: ${response.status}`);
  }
  return response.json();
}
