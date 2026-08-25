import { buildTrailerPlan, buildTrailerSeed, playTrailer, WIDTH, HEIGHT } from "./trailer.js";

// Preferred to least-preferred; whichever the browser actually supports wins.
const CANDIDATE_MIME_TYPES = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

export function isExportSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    typeof window.JSZip !== "undefined"
  );
}

function pickSupportedMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return null;
  return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || null;
}

function sanitizeFileName(title, fallback) {
  const cleaned = (title || "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "") // characters invalid in filenames on Windows/zip
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

function uniqueFileName(name, usedNames) {
  let candidate = name;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${name} (${suffix})`;
    suffix += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

// Renders one movie's trailer offscreen, in real time, and captures it with
// MediaRecorder. Reuses buildTrailerPlan + playTrailer as-is (same seed, same
// draw loop as the on-page preview) so the exported clip matches what
// "▶ Play trailer" would show. Audio is skipped (video-only capture) so
// exporting several trailers back-to-back doesn't play overlapping drones.
function captureOneTrailer(movie, movieState, mimeType) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    // Kept in the DOM (off-screen, not display:none) because some browsers
    // only drive canvas.captureStream() / rAF reliably for attached canvases.
    canvas.style.position = "fixed";
    canvas.style.left = "-10000px";
    canvas.style.top = "0";
    document.body.appendChild(canvas);

    const cleanup = () => canvas.remove();

    let recorder;
    try {
      const stream = canvas.captureStream(30);
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (err) {
      cleanup();
      reject(err);
      return;
    }

    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = (event) => {
      cleanup();
      reject(event.error || new Error("MediaRecorder error"));
    };
    recorder.onstop = () => {
      cleanup();
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" }));
    };

    const seed = buildTrailerSeed(movieState, movie);
    const plan = buildTrailerPlan(seed, movie.title);

    recorder.start();
    playTrailer(canvas, plan, () => recorder.stop(), { audio: false });
  });
}

/**
 * Renders every movie on the current table page to a .webm clip and bundles
 * them into a single zip download, named movies-page-<page>.zip.
 *
 * Deterministic: buildTrailerSeed + buildTrailerPlan are seeded from
 * movieState.seed/lang and each movie's index/title, so the same page always
 * exports the same clips.
 *
 * @param {Array} movies - movies on the current table page
 * @param {object} movieState - { seed, lang, ... } as passed to buildTrailerSeed
 * @param {number} page - current page number, used in the zip's filename
 * @param {(done: number, total: number, label: string) => void} [onProgress]
 */
export async function exportTablePage(movies, movieState, page, onProgress) {
  if (!isExportSupported()) {
    throw new Error(
      "Video export isn't supported in this browser (needs MediaRecorder, canvas.captureStream, and JSZip)."
    );
  }
  if (!movies || movies.length === 0) {
    throw new Error("No movies to export on this page.");
  }

  const mimeType = pickSupportedMimeType();
  const zip = new window.JSZip();
  const usedNames = new Set();

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    if (onProgress) onProgress(i, movies.length, `Rendering ${i + 1}/${movies.length}: ${movie.title}`);
    const blob = await captureOneTrailer(movie, movieState, mimeType);
    const fileName = uniqueFileName(sanitizeFileName(movie.title, `movie-${movie.index}`), usedNames);
    zip.file(`${fileName}.webm`, blob);
  }

  if (onProgress) onProgress(movies.length, movies.length, "Zipping...");
  const zipBlob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `movies-page-${page}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  if (onProgress) onProgress(movies.length, movies.length, "Done.");
}
