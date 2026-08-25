import { createDetailElement } from "./detail.js";

function closeOpenCard() {
  document.querySelectorAll(".movie-card .trailer-box").forEach((el) => el.stopTrailer?.());
  document.querySelectorAll(".movie-card .movie-detail").forEach((el) => el.remove());
  document.querySelectorAll(".movie-card.expanded").forEach((el) => el.classList.remove("expanded"));
}

function toggleCard(card, movie, movieState) {
  const existing = card.querySelector(".movie-detail");
  if (existing) {
    closeOpenCard();
    return;
  }

  closeOpenCard();
  card.appendChild(createDetailElement(movie, movieState));
  card.classList.add("expanded");
}

function buildCard(movie, movieState) {
  const card = document.createElement("div");
  card.className = "movie-card";

  const summary = document.createElement("div");
  summary.className = "card-summary";
  summary.innerHTML = `
    <h3>${movie.index}. ${movie.title}</h3>
    <p>${movie.genre} · ${movie.year}</p>
    <p>${movie.actors.join(", ")}</p>
    <p>${movie.likes} likes · ${movie.reviews.length} reviews</p>
  `;

  card.appendChild(summary);
  card.addEventListener("click", () => toggleCard(card, movie, movieState));
  return card;
}

export function clearGallery() {
  document.getElementById("gallery-view").innerHTML = "";
}

export function appendGalleryPage(movies, movieState) {
  const container = document.getElementById("gallery-view");
  for (const movie of movies) {
    container.appendChild(buildCard(movie, movieState));
  }
}
