import { fetchMovies } from "./api.js";
import { renderTable } from "./table.js";
import { clearGallery, appendGalleryPage } from "./gallery.js";
import { exportTablePage, isExportSupported } from "./export.js";

const state = {
  lang: "en",
  seed: "",
  likes: 3,
  reviews: 2,
  page: 1,
  view: "table",
  loadingGallery: false,
  tableMovies: [],
};

const langSelect = document.getElementById("lang-select");
const seedInput = document.getElementById("seed-input");
const randomSeedButton = document.getElementById("random-seed-button");
const likesInput = document.getElementById("likes-input");
const reviewsInput = document.getElementById("reviews-input");
const prevButton = document.getElementById("prev-page");
const nextButton = document.getElementById("next-page");
const pageLabel = document.getElementById("page-label");
const tableSection = document.getElementById("table-section");
const gallerySection = document.getElementById("gallery-section");
const tableToggle = document.getElementById("view-table-button");
const galleryToggle = document.getElementById("view-gallery-button");
const scrollSentinel = document.getElementById("scroll-sentinel");
const exportControls = document.getElementById("export-controls");
const exportButton = document.getElementById("export-page-button");
const exportStatus = document.getElementById("export-status");

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function generateRandomSeed() {
  const buffer = new Uint32Array(2);
  crypto.getRandomValues(buffer);
  const high = BigInt(buffer[0] & 0x7fffffff);
  const low = BigInt(buffer[1]);
  return (high * 4294967296n + low).toString();
}

function readToolbarState() {
  state.lang = langSelect.value;
  state.seed = seedInput.value.trim() || generateRandomSeed();
  seedInput.value = state.seed;
  state.likes = Number(likesInput.value);
  state.reviews = Number(reviewsInput.value);
}

async function loadTablePage() {
  const movies = await fetchMovies({
    seed: state.seed,
    page: state.page,
    lang: state.lang,
    likes: state.likes,
    reviews: state.reviews,
  });
  state.tableMovies = movies;
  renderTable(movies, state);
  pageLabel.textContent = `Page ${state.page}`;
  prevButton.disabled = state.page <= 1;
}

async function loadGalleryNextPage() {
  if (state.loadingGallery || state.view !== "gallery") return;
  state.loadingGallery = true;
  const movies = await fetchMovies({
    seed: state.seed,
    page: state.page,
    lang: state.lang,
    likes: state.likes,
    reviews: state.reviews,
  });
  appendGalleryPage(movies, state);
  state.page += 1;
  state.loadingGallery = false;
  fillGalleryIfNeeded();
}

function fillGalleryIfNeeded() {
  if (state.view !== "gallery") return;
  const rect = scrollSentinel.getBoundingClientRect();
  if (rect.top < window.innerHeight) {
    loadGalleryNextPage();
  }
}

function resetAndReload() {
  state.page = 1;
  if (state.view === "table") {
    loadTablePage();
  } else {
    clearGallery();
    window.scrollTo(0, 0);
    loadGalleryNextPage();
  }
}

function handleToolbarChange() {
  readToolbarState();
  resetAndReload();
}

const debouncedToolbarChange = debounce(handleToolbarChange, 400);

langSelect.addEventListener("change", handleToolbarChange);
seedInput.addEventListener("input", debouncedToolbarChange);
likesInput.addEventListener("input", debouncedToolbarChange);
reviewsInput.addEventListener("input", debouncedToolbarChange);

randomSeedButton.addEventListener("click", () => {
  seedInput.value = generateRandomSeed();
  handleToolbarChange();
});

prevButton.addEventListener("click", () => {
  if (state.page <= 1) return;
  state.page -= 1;
  loadTablePage();
});

nextButton.addEventListener("click", () => {
  state.page += 1;
  loadTablePage();
});

function setView(view) {
  state.view = view;
  tableSection.classList.toggle("hidden", view !== "table");
  gallerySection.classList.toggle("hidden", view !== "gallery");
  tableToggle.classList.toggle("active", view === "table");
  galleryToggle.classList.toggle("active", view === "gallery");
  exportControls.classList.toggle("hidden", view !== "table");
  resetAndReload();
}

tableToggle.addEventListener("click", () => setView("table"));
galleryToggle.addEventListener("click", () => setView("gallery"));

function setExportStatus(text) {
  exportStatus.textContent = text;
}

async function handleExportClick() {
  if (!isExportSupported()) {
    setExportStatus("Export needs a browser with MediaRecorder + canvas capture support.");
    return;
  }
  if (state.tableMovies.length === 0) {
    setExportStatus("Nothing to export yet.");
    return;
  }

  exportButton.disabled = true;
  try {
    await exportTablePage(state.tableMovies, state, state.page, (done, total, label) => {
      setExportStatus(label ?? `Rendering ${done}/${total}…`);
    });
  } catch (err) {
    console.error(err);
    setExportStatus(`Export failed: ${err.message}`);
  } finally {
    exportButton.disabled = false;
  }
}

exportButton.addEventListener("click", handleExportClick);
if (!isExportSupported()) {
  exportButton.disabled = true;
  setExportStatus("Export not supported in this browser.");
}

const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && state.view === "gallery") {
    loadGalleryNextPage();
  }
});
observer.observe(scrollSentinel);

seedInput.value = generateRandomSeed();
readToolbarState();
loadTablePage();
