import unittest

from self_learning_sudoku.solver_dlx import DancingLinksSudokuSolver, find_conflicts, validate_grid


class SolverTests(unittest.TestCase):
    def setUp(self) -> None:
        self.solver = DancingLinksSudokuSolver()
        self.puzzle = [
            [5, 3, 0, 0, 7, 0, 0, 0, 0],
            [6, 0, 0, 1, 9, 5, 0, 0, 0],
            [0, 9, 8, 0, 0, 0, 0, 6, 0],
            [8, 0, 0, 0, 6, 0, 0, 0, 3],
            [4, 0, 0, 8, 0, 3, 0, 0, 1],
            [7, 0, 0, 0, 2, 0, 0, 0, 6],
            [0, 6, 0, 0, 0, 0, 2, 8, 0],
            [0, 0, 0, 4, 1, 9, 0, 0, 5],
            [0, 0, 0, 0, 8, 0, 0, 7, 9],
        ]

    def test_solver_finds_valid_solution(self) -> None:
        solved = self.solver.solve(self.puzzle)
        self.assertIsNotNone(solved)
        self.assertTrue(validate_grid(solved))
        self.assertEqual(solved[0][2], 4)
        self.assertEqual(solved[8][6], 1)

    def test_conflict_detection_marks_duplicate_cells(self) -> None:
        conflicted = [row[:] for row in self.puzzle]
        conflicted[0][2] = 5
        conflicts = find_conflicts(conflicted)
        self.assertIn((0, 0), conflicts)
        self.assertIn((0, 2), conflicts)


if __name__ == "__main__":
    unittest.main()
