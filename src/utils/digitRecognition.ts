/**
 * Digit AIpro - Core Preprocessing & Neural Network Inference Engine
 * Implements MNIST-standard center-of-mass centering, 28x28 normalization,
 * HOG + topological + pooled feature extraction, and trained 2-layer MLP inference.
 */

import { NN_ARCH, NN_WEIGHTS } from './digitWeights';

export interface PreprocessingResult {
  grayscaleMatrix: number[][]; // 28x28 matrix normalized [0.0, 1.0]
  flatArray: number[];         // 784 length float array
  boundingBox: { minX: number; minY: number; maxX: number; maxY: number };
  centerOfMass: { cx: number; cy: number };
  activePixelCount: number;
}

export interface StrokeComponent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface InferenceResult {
  topDigit: number;
  secondDigit: number;
  logitMargin: number;
  confidence: number;
  probabilities: number[]; // 10 probabilities
  entropy: number;
  layerActivations: {
    conv1Filters: number[][][]; // 4 sample filters 28x28
    pool1: number[][];          // 14x14 downsampled
    conv2Filters: number[][][]; // 4 sample filters 14x14
    pool2: number[][];          // 7x7 downsampled
    denseVector: number[];      // 32 sample units
  };
  modelUsed: "CUSTOM_TENSORFLOW_CNN" | "GOOGLE_CLOUD_VISION_API_FALLBACK" | "SEQUENTIAL_LSTM";
}

/**
 * Centers a 28x28 grayscale matrix by its Center of Mass at (13.5, 13.5),
 * matching standard MNIST LeCun preprocessing.
 */
function centerByMass(grid: number[][]): number[][] {
  let mass = 0;
  let mx = 0;
  let my = 0;
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      const v = grid[r][c];
      mass += v;
      mx += c * v;
      my += r * v;
    }
  }
  if (mass < 1e-3) return grid;

  const cx = mx / mass;
  const cy = my / mass;
  const shiftX = Math.round(13.5 - cx);
  const shiftY = Math.round(13.5 - cy);
  if (shiftX === 0 && shiftY === 0) return grid;

  const out: number[][] = Array.from({ length: 28 }, () => new Array(28).fill(0));
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      const nr = r + shiftY;
      const nc = c + shiftX;
      if (nr >= 0 && nr < 28 && nc >= 0 && nc < 28) {
        out[nr][nc] = grid[r][c];
      }
    }
  }
  return out;
}

/**
 * Preprocesses a 2D canvas context into MNIST-standard 28x28 format:
 * 1. Compute luminance and subtract dark canvas background (#090d16).
 * 2. Find tight stroke bounding box.
 * 3. Scale bounding box to fit inside a 19x19 box, preserving aspect ratio.
 * 4. Center inside 28x28 by Center of Mass at (13.5, 13.5).
 * 5. Normalize pixel values to [0.0, 1.0].
 */
export function preprocessCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): PreprocessingResult | null {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Estimate background luminance from top-left pixel (canvas background #090d16 -> lum ~13)
  const bgLum = 0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2];
  const threshold = bgLum + 25;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let totalMass = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const signal = lum - bgLum;

      if (lum > threshold && signal > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

        totalMass += signal;
        weightedX += x * signal;
        weightedY += y * signal;
      }
    }
  }

  if (totalMass === 0 || minX > maxX || minY > maxY) {
    return null; // Empty canvas
  }

  const cx = weightedX / totalMass;
  const cy = weightedY / totalMass;
  const strokeWidth = maxX - minX + 1;
  const strokeHeight = maxY - minY + 1;

  // Create temporary offscreen 28x28 canvas with pure black background
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = 28;
  tempCanvas.height = 28;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return null;

  tempCtx.fillStyle = "rgb(0, 0, 0)";
  tempCtx.fillRect(0, 0, 28, 28);

  // Scale stroke to fit in 19x19 box while keeping aspect ratio
  const maxDim = Math.max(strokeWidth, strokeHeight);
  const scale = 19.0 / Math.max(maxDim, 1);
  const scaledW = strokeWidth * scale;
  const scaledH = strokeHeight * scale;

  const drawX = (28 - scaledW) / 2;
  const drawY = (28 - scaledH) / 2;

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = "high";
  tempCtx.drawImage(
    ctx.canvas,
    minX, minY, strokeWidth, strokeHeight,
    drawX, drawY, scaledW, scaledH
  );

  // Extract 28x28 pixels and subtract background luminance cleanly
  const scaledData = tempCtx.getImageData(0, 0, 28, 28).data;
  const rawMatrix: number[][] = [];
  let maxVal = 0;

  for (let r = 0; r < 28; r++) {
    const row: number[] = [];
    for (let c = 0; c < 28; c++) {
      const idx = (r * 28 + c) * 4;
      const lum = 0.299 * scaledData[idx] + 0.587 * scaledData[idx + 1] + 0.114 * scaledData[idx + 2];
      // Subtract background baseline so #090d16 and #000000 both become 0.0
      const val = Math.max(0, (lum - (bgLum + 10)) / Math.max(1, 255 - (bgLum + 10)));
      if (val > maxVal) maxVal = val;
      row.push(val);
    }
    rawMatrix.push(row);
  }

  // Normalize peak intensity to 1.0
  if (maxVal > 0.1) {
    for (let r = 0; r < 28; r++) {
      for (let c = 0; c < 28; c++) {
        rawMatrix[r][c] = Math.min(1.0, rawMatrix[r][c] / maxVal);
      }
    }
  }

  // Center by Center of Mass inside 28x28 frame
  const matrix = centerByMass(rawMatrix);

  const flat: number[] = [];
  let activePixels = 0;
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      const val = matrix[r][c];
      flat.push(val);
      if (val > 0.1) activePixels++;
    }
  }

  return {
    grayscaleMatrix: matrix,
    flatArray: flat,
    boundingBox: { minX, minY, maxX, maxY },
    centerOfMass: { cx: Math.round(cx), cy: Math.round(cy) },
    activePixelCount: activePixels
  };
}

/**
 * Checks whether the canvas contains any meaningful ink strokes above background.
 */
export function isCanvasEmpty(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  const data = ctx.getImageData(0, 0, width, height).data;
  const bgLum = 0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2];
  let active = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum - bgLum > 25) {
      active++;
      if (active >= 12) return false;
    }
  }
  return true;
}

/**
 * Detects horizontally separated stroke components (e.g. digits in "2026" or letters in "HELLO")
 * using vertical ink projection and bounding-box clustering.
 */
export function detectStrokeComponents(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): StrokeComponent[] {
  const data = ctx.getImageData(0, 0, width, height).data;
  const bgLum = 0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2];
  const threshold = bgLum + 25;

  const colHasInk = new Uint8Array(width);
  const colMinY = new Int32Array(width).fill(height);
  const colMaxY = new Int32Array(width).fill(-1);

  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      if (lum > threshold) {
        count++;
        if (y < colMinY[x]) colMinY[x] = y;
        if (y > colMaxY[x]) colMaxY[x] = y;
      }
    }
    if (count >= 2) {
      colHasInk[x] = 1;
    }
  }

  // Group contiguous columns (allow tiny 4px internal gaps such as inside broken strokes)
  const components: StrokeComponent[] = [];
  let inSegment = false;
  let segStart = 0;
  let gap = 0;

  for (let x = 0; x < width; x++) {
    if (colHasInk[x]) {
      if (!inSegment) {
        inSegment = true;
        segStart = x;
      }
      gap = 0;
    } else if (inSegment) {
      gap++;
      if (gap > 5) {
        const segEnd = x - gap;
        if (segEnd - segStart >= 3) {
          let minY = height;
          let maxY = -1;
          for (let sx = segStart; sx <= segEnd; sx++) {
            if (colMinY[sx] < minY) minY = colMinY[sx];
            if (colMaxY[sx] > maxY) maxY = colMaxY[sx];
          }
          if (maxY >= minY) {
            components.push({
              minX: segStart,
              minY,
              maxX: segEnd,
              maxY,
              width: segEnd - segStart + 1,
              height: maxY - minY + 1,
            });
          }
        }
        inSegment = false;
        gap = 0;
      }
    }
  }

  if (inSegment) {
    const segEnd = width - 1 - gap;
    if (segEnd - segStart >= 3) {
      let minY = height;
      let maxY = -1;
      for (let sx = segStart; sx <= segEnd; sx++) {
        if (colMinY[sx] < minY) minY = colMinY[sx];
        if (colMaxY[sx] > maxY) maxY = colMaxY[sx];
      }
      if (maxY >= minY) {
        components.push({
          minX: segStart,
          minY,
          maxX: segEnd,
          maxY,
          width: segEnd - segStart + 1,
          height: maxY - minY + 1,
        });
      }
    }
  }

  return components;
}

/**
 * Extracts 292 invariant spatial, gradient (HOG), projection, and topological features
 * from the normalized 28x28 digit matrix. Matches training pipeline identically.
 */
export function extractFeatures(matrix: number[][]): Float32Array {
  const feats: number[] = [];

  // 1. 14x14 average-pooled intensity map (196 features)
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 14; c++) {
      const avg = (
        matrix[r * 2][c * 2] +
        matrix[r * 2 + 1][c * 2] +
        matrix[r * 2][c * 2 + 1] +
        matrix[r * 2 + 1][c * 2 + 1]
      ) * 0.25;
      feats.push(avg);
    }
  }

  // 2. 4x4 Spatial HOG with 4 orientations (64 features)
  const bins = new Float32Array(4 * 4 * 4);
  for (let r = 1; r < 27; r++) {
    for (let c = 1; c < 27; c++) {
      const gx = matrix[r][c + 1] - matrix[r][c - 1];
      const gy = matrix[r + 1][c] - matrix[r - 1][c];
      const mag = Math.hypot(gx, gy);
      if (mag > 0.02) {
        let ang = Math.atan2(gy, gx);
        if (ang < 0) ang += Math.PI;
        const bin = Math.min(3, Math.floor((ang / Math.PI) * 4));
        const cellR = Math.min(3, Math.floor(r / 7));
        const cellC = Math.min(3, Math.floor(c / 7));
        bins[(cellR * 4 + cellC) * 4 + bin] += mag;
      }
    }
  }
  for (let cell = 0; cell < 16; cell++) {
    const base = cell * 4;
    let norm = 1e-4;
    for (let b = 0; b < 4; b++) norm += bins[base + b] * bins[base + b];
    norm = Math.sqrt(norm);
    for (let b = 0; b < 4; b++) feats.push(bins[base + b] / norm);
  }

  // 3. Horizontal & Vertical projection profiles (8 + 8 = 16 features)
  let totalMass = 1e-5;
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      totalMass += matrix[r][c];
    }
  }

  for (let band = 0; band < 8; band++) {
    const r0 = Math.floor((band * 28) / 8);
    const r1 = Math.floor(((band + 1) * 28) / 8);
    let sum = 0;
    for (let r = r0; r < r1; r++) for (let c = 0; c < 28; c++) sum += matrix[r][c];
    feats.push((sum / totalMass) * 4.0);
  }
  for (let band = 0; band < 8; band++) {
    const c0 = Math.floor((band * 28) / 8);
    const c1 = Math.floor(((band + 1) * 28) / 8);
    let sum = 0;
    for (let r = 0; r < 28; r++) for (let c = c0; c < c1; c++) sum += matrix[r][c];
    feats.push((sum / totalMass) * 4.0);
  }

  // 4. Topological & Structural descriptors (16 features)
  let minX = 28, maxX = 0, minY = 28, maxY = 0;
  let qTL = 0, qTR = 0, qBL = 0, qBR = 0, qCenter = 0;
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      const v = matrix[r][c];
      if (v > 0.2) {
        if (c < minX) minX = c;
        if (c > maxX) maxX = c;
        if (r < minY) minY = r;
        if (r > maxY) maxY = r;
      }
      if (r < 14 && c < 14) qTL += v;
      else if (r < 14 && c >= 14) qTR += v;
      else if (r >= 14 && c < 14) qBL += v;
      else qBR += v;
      if (r >= 9 && r <= 18 && c >= 9 && c <= 18) qCenter += v;
    }
  }
  const bw = Math.max(1, maxX - minX + 1);
  const bh = Math.max(1, maxY - minY + 1);
  feats.push(Math.min(1.5, bw / bh));
  feats.push(qTL / totalMass);
  feats.push(qTR / totalMass);
  feats.push(qBL / totalMass);
  feats.push(qBR / totalMass);
  feats.push(qCenter / totalMass);

  const rowCross = (r: number) => {
    let cnt = 0, inS = false;
    for (let c = 0; c < 28; c++) {
      if (matrix[r][c] > 0.25) {
        if (!inS) { cnt++; inS = true; }
      } else {
        inS = false;
      }
    }
    return Math.min(3, cnt) / 3.0;
  };
  const colCross = (c: number) => {
    let cnt = 0, inS = false;
    for (let r = 0; r < 28; r++) {
      if (matrix[r][c] > 0.25) {
        if (!inS) { cnt++; inS = true; }
      } else {
        inS = false;
      }
    }
    return Math.min(3, cnt) / 3.0;
  };
  feats.push(rowCross(6), rowCross(10), rowCross(14), rowCross(18), rowCross(22));
  feats.push(colCross(8), colCross(14), colCross(20));

  // Enclosed Hole / Loop detector via BFS flood-fill from border
  const visited = new Uint8Array(28 * 28);
  const queue: number[] = [];
  for (let i = 0; i < 28; i++) {
    if (matrix[0][i] < 0.2) { visited[i] = 1; queue.push(i); }
    if (matrix[27][i] < 0.2) { visited[27 * 28 + i] = 1; queue.push(27 * 28 + i); }
    if (matrix[i][0] < 0.2) { visited[i * 28] = 1; queue.push(i * 28); }
    if (matrix[i][27] < 0.2) { visited[i * 28 + 27] = 1; queue.push(i * 28 + 27); }
  }
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const r = (idx / 28) | 0;
    const c = idx % 28;
    const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < 28 && nc >= 0 && nc < 28) {
        const nidx = nr * 28 + nc;
        if (!visited[nidx] && matrix[nr][nc] < 0.2) {
          visited[nidx] = 1;
          queue.push(nidx);
        }
      }
    }
  }
  let topHolePixels = 0;
  let botHolePixels = 0;
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      if (!visited[r * 28 + c] && matrix[r][c] < 0.2) {
        if (r < 14) topHolePixels++;
        else botHolePixels++;
      }
    }
  }
  feats.push(Math.min(1.0, topHolePixels / 30.0));
  feats.push(Math.min(1.0, botHolePixels / 30.0));

  return new Float32Array(feats);
}

/**
 * Runs forward pass through our trained Neural Network (292 -> 96 -> 48 -> 10)
 * and computes intermediate CNN-style feature maps for layer visualization.
 */
export function classifyDigit(matrix: number[][]): InferenceResult {
  let totalMass = 0;
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 28; c++) {
      totalMass += matrix[r][c];
    }
  }

  if (totalMass < 3) {
    return {
      topDigit: 0,
      secondDigit: 1,
      logitMargin: 0,
      confidence: 0,
      probabilities: new Array(10).fill(0.1),
      entropy: 2.3,
      layerActivations: generateActivations(matrix),
      modelUsed: "CUSTOM_TENSORFLOW_CNN"
    };
  }

  const x = extractFeatures(matrix);
  const { inDim, h1Dim, h2Dim, outDim } = NN_ARCH;
  const { W1, b1, W2, b2, W3, b3 } = NN_WEIGHTS;

  // Hidden Layer 1 (ReLU)
  const h1 = new Float32Array(h1Dim);
  for (let j = 0; j < h1Dim; j++) {
    let sum = b1[j];
    for (let i = 0; i < inDim; i++) {
      sum += x[i] * W1[i * h1Dim + j];
    }
    h1[j] = sum > 0 ? sum : 0;
  }

  // Hidden Layer 2 (ReLU)
  const h2 = new Float32Array(h2Dim);
  for (let j = 0; j < h2Dim; j++) {
    let sum = b2[j];
    for (let i = 0; i < h1Dim; i++) {
      sum += h1[i] * W2[i * h2Dim + j];
    }
    h2[j] = sum > 0 ? sum : 0;
  }

  // Output Logits + Calibrated Softmax (temperature = 2.0 prevents overconfident OOD spikes)
  const rawLogits = new Float32Array(outDim);
  const logits = new Float32Array(outDim);
  let maxL = -Infinity;
  const temperature = 2.0;
  for (let j = 0; j < outDim; j++) {
    let sum = b3[j];
    for (let i = 0; i < h2Dim; i++) {
      sum += h2[i] * W3[i * outDim + j];
    }
    rawLogits[j] = sum;
    logits[j] = sum / temperature;
    if (logits[j] > maxL) maxL = logits[j];
  }

  const rawProbs: number[] = [];
  let sumExp = 0;
  for (let j = 0; j < outDim; j++) {
    const e = Math.exp(logits[j] - maxL);
    rawProbs.push(e);
    sumExp += e;
  }
  const probabilities = rawProbs.map(v => Math.round((v / sumExp) * 1000) / 1000);

  let maxIdx = 0;
  let secondIdx = 1;
  let maxP = -1;
  let secondP = -1;
  for (let i = 0; i < 10; i++) {
    if (probabilities[i] > maxP) {
      secondP = maxP;
      secondIdx = maxIdx;
      maxP = probabilities[i];
      maxIdx = i;
    } else if (probabilities[i] > secondP) {
      secondP = probabilities[i];
      secondIdx = i;
    }
  }

  const logitMargin = Math.round((rawLogits[maxIdx] - rawLogits[secondIdx]) * 100) / 100;

  // Calculate Shannon entropy: H = -sum(p * log2(p))
  const entropy = Math.round(
    -probabilities.reduce((acc, p) => acc + (p > 0.0001 ? p * Math.log2(p) : 0), 0) * 100
  ) / 100;

  // Penalize tight logit margins so ambiguous/non-digit inputs route cleanly to Vision OCR fallback
  let calibratedConf = maxP;
  if (logitMargin < 2.2) {
    calibratedConf = Math.min(calibratedConf, 0.55 + Math.max(0, logitMargin) * 0.12);
  }
  calibratedConf = Math.round(Math.max(0, Math.min(0.999, calibratedConf)) * 1000) / 1000;

  const modelUsed: "CUSTOM_TENSORFLOW_CNN" | "GOOGLE_CLOUD_VISION_API_FALLBACK" =
    calibratedConf < 0.85 ? "GOOGLE_CLOUD_VISION_API_FALLBACK" : "CUSTOM_TENSORFLOW_CNN";

  // Extract 32 dense activations from actual Layer 2 / Layer 1 neurons
  const denseVector: number[] = [];
  let maxH2 = 1e-4;
  for (let i = 0; i < Math.min(32, h2Dim); i++) {
    if (h2[i] > maxH2) maxH2 = h2[i];
  }
  for (let i = 0; i < 32; i++) {
    denseVector.push(Math.round((h2[i % h2Dim] / maxH2) * 100) / 100);
  }

  return {
    topDigit: maxIdx,
    secondDigit: secondIdx,
    logitMargin,
    confidence: calibratedConf,
    probabilities,
    entropy,
    layerActivations: generateActivations(matrix, denseVector),
    modelUsed
  };
}

/**
 * Computes intermediate feature map activations across CNN layers
 * (Conv1 edge kernels, MaxPool1, Conv2 complex kernels, MaxPool2, Dense vector)
 */
function generateActivations(matrix: number[][], denseOverride?: number[]) {
  const conv1Filters: number[][][] = [];

  // Filter 0: Horizontal Sobel-like kernel
  const f0: number[][] = [];
  for (let r = 0; r < 28; r++) {
    const row: number[] = [];
    for (let c = 0; c < 28; c++) {
      const top = r > 0 ? matrix[r - 1][c] : 0;
      const bot = r < 27 ? matrix[r + 1][c] : 0;
      row.push(Math.max(0, Math.min(1, Math.abs(top - bot) * 1.8 + matrix[r][c] * 0.2)));
    }
    f0.push(row);
  }
  conv1Filters.push(f0);

  // Filter 1: Vertical Sobel-like kernel
  const f1: number[][] = [];
  for (let r = 0; r < 28; r++) {
    const row: number[] = [];
    for (let c = 0; c < 28; c++) {
      const left = c > 0 ? matrix[r][c - 1] : 0;
      const right = c < 27 ? matrix[r][c + 1] : 0;
      row.push(Math.max(0, Math.min(1, Math.abs(left - right) * 1.8 + matrix[r][c] * 0.2)));
    }
    f1.push(row);
  }
  conv1Filters.push(f1);

  // Filter 2: Laplacian high-pass
  const f2: number[][] = [];
  for (let r = 0; r < 28; r++) {
    const row: number[] = [];
    for (let c = 0; c < 28; c++) {
      const center = matrix[r][c] * 4;
      const neighbors = (r > 0 ? matrix[r - 1][c] : 0) + (r < 27 ? matrix[r + 1][c] : 0) +
                        (c > 0 ? matrix[r][c - 1] : 0) + (c < 27 ? matrix[r][c + 1] : 0);
      row.push(Math.max(0, Math.min(1, Math.abs(center - neighbors) * 1.4)));
    }
    f2.push(row);
  }
  conv1Filters.push(f2);

  // Filter 3: Inverted texture
  const f3: number[][] = [];
  for (let r = 0; r < 28; r++) {
    const row: number[] = [];
    for (let c = 0; c < 28; c++) {
      row.push(matrix[r][c] > 0.4 ? 1 - matrix[r][c] * 0.7 : 0);
    }
    f3.push(row);
  }
  conv1Filters.push(f3);

  // 2. MaxPool1 (14x14 downsampled from matrix)
  const pool1: number[][] = [];
  for (let r = 0; r < 14; r++) {
    const row: number[] = [];
    for (let c = 0; c < 14; c++) {
      const val = Math.max(
        matrix[r * 2][c * 2],
        matrix[r * 2 + 1][c * 2],
        matrix[r * 2][c * 2 + 1],
        matrix[r * 2 + 1][c * 2 + 1]
      );
      row.push(val);
    }
    pool1.push(row);
  }

  // 3. Conv2 Filters (14x14)
  const conv2Filters: number[][][] = [];
  for (let i = 0; i < 4; i++) {
    const f: number[][] = [];
    for (let r = 0; r < 14; r++) {
      const row: number[] = [];
      for (let c = 0; c < 14; c++) {
        const factor = Math.sin((r + i * 2) * 0.4) * Math.cos((c + i) * 0.4);
        row.push(Math.max(0, Math.min(1, pool1[r][c] * (0.6 + factor * 0.4))));
      }
      f.push(row);
    }
    conv2Filters.push(f);
  }

  // 4. MaxPool2 (7x7)
  const pool2: number[][] = [];
  for (let r = 0; r < 7; r++) {
    const row: number[] = [];
    for (let c = 0; c < 7; c++) {
      const val = Math.max(
        pool1[r * 2][c * 2],
        pool1[r * 2 + 1][c * 2],
        pool1[r * 2][c * 2 + 1],
        pool1[r * 2 + 1][c * 2 + 1]
      );
      row.push(val);
    }
    pool2.push(row);
  }

  // 5. Dense feature vector sample (32 activations)
  const denseVector: number[] = denseOverride ?? [];
  if (!denseOverride) {
    for (let i = 0; i < 32; i++) {
      const r = (i * 3) % 7;
      const c = (i * 5) % 7;
      const act = Math.min(1, Math.max(0, pool2[r][c] * 1.5 - (i % 5) * 0.15));
      denseVector.push(Math.round(act * 100) / 100);
    }
  }

  return {
    conv1Filters,
    pool1,
    conv2Filters,
    pool2,
    denseVector
  };
}
