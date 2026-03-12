const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Sends a grid to the backend to get a fully solved grid.
 */
export const solveGrid = async (grid) => {
  try {
    const response = await fetch(`${API_URL}/solve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grid }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to solve grid");
    }

    const data = await response.json();
    return data.solved; // 2D array
  } catch (err) {
    console.error("solverClient solveGrid error:", err);
    throw err;
  }
};

/**
 * Sends a grid to the backend to get a step-by-step solution path for animation.
 */
export const getStepByStepSolution = async (grid) => {
  try {
    const response = await fetch(`${API_URL}/solve-steps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grid }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get solution steps");
    }

    const data = await response.json();
    return data; // { solved: 2D array, steps: [{row, col, value}] }
  } catch (err) {
    console.error("solverClient getStepByStepSolution error:", err);
    throw err;
  }
};

/**
 * Requests a newly generated Sudoku puzzle.
 */
export const generatePuzzle = async (difficulty = 'medium') => {
  try {
    const response = await fetch(`${API_URL}/generate?difficulty=${difficulty}`);
    
    if (!response.ok) {
      throw new Error("Failed to generate puzzle");
    }

    const data = await response.json();
    return data.grid; // 2D array
  } catch (err) {
    console.error("solverClient generatePuzzle error:", err);
    throw err;
  }
};

/**
 * Evaluates the difficulty of a provided grid.
 */
export const analyzeDifficulty = async (grid) => {
  try {
    const response = await fetch(`${API_URL}/difficulty`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ grid }),
    });

    if (!response.ok) {
      throw new Error("Failed to analyze difficulty");
    }

    const data = await response.json();
    return data.difficulty; // e.g., 'Easy', 'Medium', 'Hard', 'Expert'
  } catch (err) {
    console.error("solverClient analyzeDifficulty error:", err);
    throw err;
  }
};
