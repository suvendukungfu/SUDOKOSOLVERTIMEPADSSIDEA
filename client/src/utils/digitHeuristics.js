const IMAGE_SIZE = 28;
const INK_THRESHOLD = 0.08;
const ONE_SEVEN_PAIR = "1,7";

const getPixel = (imgData, x, y) => imgData[y * IMAGE_SIZE + x] || 0;

const getBoundingBox = (imgData) => {
  let minX = IMAGE_SIZE;
  let minY = IMAGE_SIZE;
  let maxX = -1;
  let maxY = -1;
  let totalInk = 0;

  for (let y = 0; y < IMAGE_SIZE; y += 1) {
    for (let x = 0; x < IMAGE_SIZE; x += 1) {
      const value = getPixel(imgData, x, y);
      totalInk += value;
      if (value <= INK_THRESHOLD) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX === -1 || maxY === -1) {
    return null;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    totalInk,
  };
};

const getBandRange = (box, startRatio, endRatio) => {
  const start = box.minY + Math.floor(box.height * startRatio);
  const end = box.minY + Math.max(start + 1, Math.ceil(box.height * endRatio));
  return [start, Math.min(box.maxY + 1, end)];
};

const getBandInk = (imgData, box, startY, endY) => {
  let sum = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = box.minX; x <= box.maxX; x += 1) {
      sum += getPixel(imgData, x, y);
    }
  }

  return sum;
};

const getBandWidth = (imgData, box, startY, endY) => {
  let minX = IMAGE_SIZE;
  let maxX = -1;

  for (let y = startY; y < endY; y += 1) {
    for (let x = box.minX; x <= box.maxX; x += 1) {
      if (getPixel(imgData, x, y) <= INK_THRESHOLD) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
  }

  return maxX === -1 ? 0 : maxX - minX + 1;
};

const getDominantColumnShare = (imgData, box) => {
  let dominant = 0;

  for (let x = box.minX; x <= box.maxX; x += 1) {
    let columnInk = 0;
    for (let y = box.minY; y <= box.maxY; y += 1) {
      columnInk += getPixel(imgData, x, y);
    }
    dominant = Math.max(dominant, columnInk);
  }

  return dominant / Math.max(box.totalInk, 1e-6);
};

const getBandCentroidX = (imgData, box, startY, endY) => {
  let weightedX = 0;
  let total = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = box.minX; x <= box.maxX; x += 1) {
      const value = getPixel(imgData, x, y);
      weightedX += value * x;
      total += value;
    }
  }

  return total > 0 ? weightedX / total : (box.minX + box.maxX) / 2;
};

export const analyzeOneSevenShape = (imgData) => {
  const box = getBoundingBox(imgData);
  if (!box) {
    return {
      prediction: null,
      confidence: 0,
      reason: "empty",
      features: null,
    };
  }

  const [topStart, topEnd] = getBandRange(box, 0, 0.32);
  const [middleStart, middleEnd] = getBandRange(box, 0.32, 0.7);
  const [bottomStart, bottomEnd] = getBandRange(box, 0.7, 1);

  const topInk = getBandInk(imgData, box, topStart, topEnd);
  const middleInk = getBandInk(imgData, box, middleStart, middleEnd);
  const topWidth = getBandWidth(imgData, box, topStart, topEnd);
  const middleWidth = getBandWidth(imgData, box, middleStart, middleEnd);
  const dominantColumnShare = getDominantColumnShare(imgData, box);
  const topCentroidX = getBandCentroidX(imgData, box, topStart, topEnd);
  const bottomCentroidX = getBandCentroidX(imgData, box, bottomStart, bottomEnd);

  const features = {
    topWidthRatio: topWidth / Math.max(box.width, 1),
    middleWidthRatio: middleWidth / Math.max(box.width, 1),
    topInkRatio: topInk / Math.max(box.totalInk, 1e-6),
    middleInkRatio: middleInk / Math.max(box.totalInk, 1e-6),
    aspectRatio: box.width / Math.max(box.height, 1),
    dominantColumnShare,
    slant: topCentroidX - bottomCentroidX,
  };

  let oneScore = 0;
  let sevenScore = 0;

  if (features.topWidthRatio >= 0.78) {
    sevenScore += 2.3;
  } else {
    oneScore += 1.2;
  }

  if (features.topInkRatio >= 0.29) {
    sevenScore += 1.5;
  } else {
    oneScore += 0.8;
  }

  if (features.middleWidthRatio >= 0.7) {
    oneScore += 0.9;
  } else {
    sevenScore += 0.7;
  }

  if (features.dominantColumnShare >= 0.24) {
    oneScore += 2.7;
  } else if (features.dominantColumnShare >= 0.17) {
    oneScore += 1.9;
  } else {
    sevenScore += 0.9;
  }

  if (features.aspectRatio <= 0.4) {
    oneScore += 2.1;
  } else if (features.aspectRatio <= 0.52) {
    oneScore += 1.1;
  } else {
    sevenScore += 0.7;
  }

  if (features.slant >= 1.35) {
    sevenScore += 0.9;
  } else if (features.slant <= 0.6) {
    oneScore += 0.8;
  } else {
    oneScore += 0.4;
  }

  if (features.topWidthRatio - features.middleWidthRatio >= 0.18) {
    sevenScore += 0.8;
  }

  const prediction = sevenScore > oneScore ? 7 : 1;
  const scoreGap = Math.abs(sevenScore - oneScore);
  const confidence = Math.min(0.95, 0.55 + scoreGap / 5);

  return {
    prediction,
    confidence,
    reason: prediction === 7 ? "top-bar" : "vertical-stroke",
    features,
  };
};

export const resolveDigitPrediction = (probabilities, imgData, minConfidence = 0.6) => {
  const ranked = probabilities
    .map((p, idx) => ({ idx, p }))
    .sort((a, b) => b.p - a.p);

  const best = ranked[0];
  const second = ranked[1] || { idx: null, p: 0 };
  const pairKey = [best.idx, second.idx].sort((a, b) => a - b).join(",");
  const alternatives = [];

  let prediction = best.idx;
  let acceptedConfidence = best.p;
  let note = null;
  let shapeHint = null;

  if (pairKey === ONE_SEVEN_PAIR) {
    shapeHint = analyzeOneSevenShape(imgData);
    const pairConfidence = best.p + second.p;
    const modelMargin = best.p - second.p;
    const heuristicReliable = shapeHint.confidence >= 0.6;
    const heuristicStrong = shapeHint.confidence >= 0.72;
    const heuristicPrefersSecond = shapeHint.prediction === second.idx;
    const heuristicPrefersBest = shapeHint.prediction === best.idx;

    if (heuristicStrong && heuristicPrefersSecond && modelMargin <= 0.18) {
      prediction = second.idx;
      acceptedConfidence = second.p;
      note = `shape override ${best.idx}->${second.idx}`;
    }

    if (
      heuristicReliable &&
      pairConfidence >= 0.76 &&
      (heuristicPrefersBest || heuristicPrefersSecond)
    ) {
      acceptedConfidence = Math.max(acceptedConfidence, Math.min(0.74, pairConfidence - 0.08));
    }

    if (modelMargin <= 0.22 || heuristicReliable) {
      alternatives.push(prediction === best.idx ? second.idx : best.idx);
    }
  }

  const accepted = acceptedConfidence >= minConfidence;

  if (!accepted && !alternatives.length && second.idx !== null && best.p - second.p <= 0.14) {
    alternatives.push(second.idx);
  }

  return {
    prediction: accepted ? prediction : 0,
    best,
    second,
    alternatives: [...new Set(alternatives.filter((value) => Number.isInteger(value) && value > 0))],
    lowConfidence: !accepted,
    note,
    shapeHint,
  };
};
