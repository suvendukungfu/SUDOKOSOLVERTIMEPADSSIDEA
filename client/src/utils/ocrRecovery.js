const BOARD_SIZE = 9;
const AUTO_ONE_SEVEN_LIMIT = 10;

const toIndex = (row, col) => row * BOARD_SIZE + col;

const normalizeCandidates = (value) => {
  const raw = Array.isArray(value) ? value : [value];

  return [...new Set(
    raw
      .map((candidate) => Number(candidate))
      .filter((candidate) => Number.isInteger(candidate) && candidate >= 1 && candidate <= 9),
  )];
};

export const getOneSevenAlternate = (value) => {
  if (value === 1) return 7;
  if (value === 7) return 1;
  return null;
};

export const normalizeUncertaintyMap = (uncertainties = {}) => {
  const normalized = {};

  Object.entries(uncertainties).forEach(([key, value]) => {
    const index = Number.parseInt(key, 10);
    if (Number.isNaN(index) || index < 0 || index >= BOARD_SIZE * BOARD_SIZE) {
      return;
    }

    const candidates = normalizeCandidates(value);
    if (candidates.length > 0) {
      normalized[index] = candidates;
    }
  });

  return normalized;
};

export const buildRecoveryUncertainties = (grid, baseUncertainties = {}, conflicts = []) => {
  const uncertainties = normalizeUncertaintyMap(baseUncertainties);
  const conflictIndexes = new Set(conflicts.map(([row, col]) => toIndex(row, col)));
  const fallbackCandidates = [];

  grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const alternate = getOneSevenAlternate(cell);
      if (!alternate) return;

      const index = toIndex(rowIndex, colIndex);
      const existing = uncertainties[index] || [];
      if (existing.includes(alternate)) return;

      fallbackCandidates.push({
        index,
        alternate,
        priority: conflictIndexes.has(index) ? 0 : 1,
      });
    });
  });

  fallbackCandidates
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .forEach(({ index, alternate, priority }, order) => {
      if (priority > 0) {
        const nonConflictCount = fallbackCandidates
          .slice(0, order + 1)
          .filter((candidate) => candidate.priority > 0)
          .length;

        if (nonConflictCount > AUTO_ONE_SEVEN_LIMIT) {
          return;
        }
      }

      uncertainties[index] = [...(uncertainties[index] || []), alternate];
    });

  return uncertainties;
};

export const applySolvedCorrectionsToGivens = (grid, solvedGrid) =>
  grid.map((row, rowIndex) =>
    row.map((cell, colIndex) => (cell == null || cell === 0 ? null : solvedGrid[rowIndex][colIndex])),
  );

export const removeResolvedUncertainties = (uncertainties = {}, corrections = []) => {
  if (!corrections.length) {
    return uncertainties;
  }

  const next = { ...uncertainties };
  corrections.forEach(({ row, col }) => {
    delete next[toIndex(row, col)];
  });

  return next;
};
