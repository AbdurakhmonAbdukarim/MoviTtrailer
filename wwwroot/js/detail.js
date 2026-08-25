import { buildTrailerPlan, buildTrailerSeed, drawFreezeFrame, playTrailer, WIDTH, HEIGHT } from "./trailer.js";

function buildTrailerBox(movie, movieState) {
  const box = document.createElement("div");
  box.className = "trailer-box";

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  canvas.className = "trailer-canvas";

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.className = "play-button";
  playButton.textContent = "▶ Play trailer";

  const plan = buildTrailerPlan(buildTrailerSeed(movieState, movie), movie.title);
  drawFreezeFrame(canvas, plan);

  let stopPlayback = null;

  playButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (stopPlayback) return;
    playButton.disabled = true;
    playButton.textContent = "Playing...";
    stopPlayback = playTrailer(canvas, plan, () => {
      drawFreezeFrame(canvas, plan);
      playButton.disabled = false;
      playButton.textContent = "▶ Play trailer";
      stopPlayback = null;
    });
  });

  // Called by gallery/table when this card collapses, so a playing
  // trailer (and its audio drone) doesn't keep running in the background.
  box.stopTrailer = () => {
    if (!stopPlayback) return;
    stopPlayback();
    stopPlayback = null;
    drawFreezeFrame(canvas, plan);
    playButton.disabled = false;
    playButton.textContent = "▶ Play trailer";
  };

  box.appendChild(canvas);
  box.appendChild(playButton);
  return box;
}

function buildReviewsBox(movie) {
  const box = document.createElement("div");
  box.className = "reviews-box";

  if (movie.reviews.length === 0) {
    box.textContent = "No reviews yet.";
    return box;
  }

  const list = document.createElement("ul");
  for (const review of movie.reviews) {
    const item = document.createElement("li");
    item.textContent = review;
    list.appendChild(item);
  }
  box.appendChild(list);
  return box;
}

export function createDetailElement(movie, movieState) {
  const container = document.createElement("div");
  container.className = "movie-detail";
  container.appendChild(buildTrailerBox(movie, movieState));
  container.appendChild(buildReviewsBox(movie));
  return container;
}
