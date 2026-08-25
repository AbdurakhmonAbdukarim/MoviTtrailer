import { createDetailElement } from "./detail.js";

function closeOpenRow() {
  document.querySelectorAll(".detail-row .trailer-box").forEach((el) => el.stopTrailer?.());
  document.querySelectorAll(".detail-row").forEach((el) => el.remove());
  document.querySelectorAll(".movie-row.expanded").forEach((el) => el.classList.remove("expanded"));
}

function toggleRow(row, movie, movieState) {
  const next = row.nextElementSibling;
  if (next && next.classList.contains("detail-row")) {
    closeOpenRow();
    return;
  }

  closeOpenRow();

  const detailRow = document.createElement("tr");
  detailRow.className = "detail-row";
  const cell = document.createElement("td");
  cell.colSpan = 7;
  cell.appendChild(createDetailElement(movie, movieState));
  detailRow.appendChild(cell);

  row.after(detailRow);
  row.classList.add("expanded");
}

function buildRow(movie, movieState) {
  const row = document.createElement("tr");
  row.className = "movie-row";
  row.innerHTML = `
    <td>${movie.index}</td>
    <td>${movie.title}</td>
    <td>${movie.actors.join(", ")}</td>
    <td>${movie.year}</td>
    <td>${movie.genre}</td>
    <td>${movie.likes}</td>
    <td>${movie.reviews.length}</td>
  `;
  row.addEventListener("click", () => toggleRow(row, movie, movieState));
  return row;
}

export function renderTable(movies, movieState) {
  const tbody = document.getElementById("movie-rows");
  tbody.innerHTML = "";
  for (const movie of movies) {
    tbody.appendChild(buildRow(movie, movieState));
  }
}
