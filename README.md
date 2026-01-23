#  AI-Powered Sudoku Solver

**Image-to-Solution using OCR, OpenCV & Backtracking**

An advanced **AI-powered Sudoku Solver** that can **extract a Sudoku puzzle from an image**, allow **manual correction**, and **solve it visually** using an efficient backtracking algorithm.
The project is inspired by modern puzzle-game aesthetics (Lovable-style UI) and is built with a clean **full-stack architecture**.

---

##  Live Features

* **Image Upload (Drag & Drop / Camera)**
*  **Computer Vision with OpenCV.js**
*  **OCR Digit Recognition using Tesseract.js**
*  **Manual Grid Editing (Error Correction)**
*  **Backtracking Sudoku Solver Algorithm**
*  **Modern Dark UI with Animations**
*  **Fast & Deterministic Solving**
*  **Keyboard & Mouse Interaction**

---

##  Preview (UI Concept)

> Dark, modern puzzle-game inspired UI with:

* Cyan accents for original digits
* Purple highlights for solved cells
* Smooth animations for solving steps

*(Screenshots / GIFs can be added here later)*

---

##  Project Architecture

```
ai-sudoku-solver/
│
├── client/                 # Frontend (React + OpenCV + OCR)
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── UploadZone.jsx
│   │   │   ├── SudokuGrid.jsx
│   │   │   ├── NumberPad.jsx
│   │   │   ├── Controls.jsx
│   │   │   └── Loader.jsx
│   │   ├── utils/          # Core logic helpers
│   │   │   ├── opencv.js   # Grid detection & perspective transform
│   │   │   ├── ocr.js      # Digit recognition (Tesseract.js)
│   │   │   └── solverClient.js
│   │   ├── styles/         # Theme, grid & animations
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── index.html
│
├── server/                 # Backend (Node.js + Express)
│   ├── solver/
│   │   └── sudokuSolver.js # Backtracking algorithm
│   ├── routes/
│   │   └── solve.js        # API route
│   └── index.js
│
└── README.md
```

---

##  How It Works (End-to-End Flow)

1. **User uploads a Sudoku image** or enters values manually.
2. **OpenCV.js** processes the image:

   * Grayscale conversion
   * Adaptive thresholding
   * Contour detection
   * Perspective warp
   * Grid segmentation (81 cells)
3. **Tesseract.js OCR** extracts digits from each cell.
4. Parsed grid is shown to the user for **manual correction**.
5. Grid is sent to the backend `/solve` API.
6. **Backtracking algorithm** solves the puzzle.
7. Solution is returned and **animated visually** on the UI.

---

##  Sudoku Solver Algorithm

* Uses **recursive backtracking**
* Ensures:

  * Row uniqueness
  * Column uniqueness
  * 3×3 sub-grid uniqueness
* Efficient for all valid Sudoku puzzles
* Returns error for **invalid or unsolvable puzzles**

---

##  Tech Stack

### Frontend

* **React.js (Vite)**
* **Tailwind CSS**
* **Framer Motion**
* **OpenCV.js**
* **Tesseract.js**
* **HTML Canvas API**

### Backend

* **Node.js**
* **Express.js**
* **REST API**

### DevOps / Tools

* **Git & GitHub**
* **Vercel (Frontend Deployment)**
* **Render / Railway (Backend Deployment)**

---

##  Installation & Setup

###  Clone Repository

```bash
git clone https://github.com/<your-username>/ai-sudoku-solver.git
cd ai-sudoku-solver
```

###  Frontend Setup

```bash
cd client
npm install
npm run dev
```

Runs at: `http://localhost:5173`

###  Backend Setup

```bash
cd server
npm install
node index.js
```

Runs at: `http://localhost:5000`

---

## Usage Instructions

1. Upload a **clear Sudoku image** (PNG / JPG).
2. Review detected digits.
3. Correct any OCR mistakes manually.
4. Click **Solve Puzzle**.
5. Watch the solution animate cell-by-cell.

> ℹ️ OCR works best with printed Sudoku images. Handwritten puzzles may require manual correction.

---

##  Limitations

* OCR accuracy depends on image quality.
* Handwritten digits may need manual fixes.
* Extremely skewed images may fail grid detection.

---

##  Future Enhancements

*  CNN-based digit classifier (TensorFlow.js)
*  Step-by-step solving visualization
*  Mobile-first optimizations
*  Multiplayer / puzzle sharing
*  Difficulty estimation
*  Cloud-based OCR fallback

---

##  Author

**Suvendu Kumar Sahoo**
Software Developer | Full-Stack | AI & Computer Vision
Email: ssuvendukumar489@gmail.com
GitHub:https://github.com/suvendukungfu
LinkedIn: (https://www.linkedin.com/in/suvendu-kumar-sahoo-4566b3324/)

---

##  License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute.

---

## If You Like This Project

Give it a ⭐ on GitHub — it really helps!

---


