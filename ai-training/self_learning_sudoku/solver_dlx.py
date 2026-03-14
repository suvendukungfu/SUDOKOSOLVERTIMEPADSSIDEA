from __future__ import annotations


class DancingLinksSudokuSolver:
    """
    Exact-cover Sudoku solver using Algorithm X with dancing-links style column reduction.
    The internal representation is set-based instead of pointer-based, which is much easier
    to audit in Python while preserving the exact-cover search behavior.
    """

    @staticmethod
    def _candidate_columns(row: int, col: int, digit: int) -> tuple[int, int, int, int]:
        digit_index = digit - 1
        cell_constraint = row * 9 + col
        row_constraint = 81 + row * 9 + digit_index
        col_constraint = 162 + col * 9 + digit_index
        box = (row // 3) * 3 + (col // 3)
        box_constraint = 243 + box * 9 + digit_index
        return cell_constraint, row_constraint, col_constraint, box_constraint

    def _build_exact_cover(self, grid: list[list[int]]) -> tuple[dict[tuple[int, int, int], tuple[int, int, int, int]], dict[int, set[tuple[int, int, int]]]]:
        rows: dict[tuple[int, int, int], tuple[int, int, int, int]] = {}
        columns: dict[int, set[tuple[int, int, int]]] = {column: set() for column in range(324)}

        for row in range(9):
            for col in range(9):
                candidates = range(1, 10) if grid[row][col] == 0 else (grid[row][col],)
                for digit in candidates:
                    row_id = (row, col, digit)
                    row_columns = self._candidate_columns(row, col, digit)
                    rows[row_id] = row_columns
                    for column in row_columns:
                        columns[column].add(row_id)

        return rows, columns

    @staticmethod
    def _select(
        columns: dict[int, set[tuple[int, int, int]]],
        rows: dict[tuple[int, int, int], tuple[int, int, int, int]],
        row_id: tuple[int, int, int],
    ) -> list[set[tuple[int, int, int]]]:
        removed_columns = []
        for column in rows[row_id]:
            for other_row in list(columns[column]):
                for other_column in rows[other_row]:
                    if other_column != column and other_row in columns.get(other_column, set()):
                        columns[other_column].remove(other_row)
            removed_columns.append(columns.pop(column))
        return removed_columns

    @staticmethod
    def _deselect(
        columns: dict[int, set[tuple[int, int, int]]],
        rows: dict[tuple[int, int, int], tuple[int, int, int, int]],
        row_id: tuple[int, int, int],
        removed_columns: list[set[tuple[int, int, int]]],
    ) -> None:
        for column in reversed(rows[row_id]):
            columns[column] = removed_columns.pop()
            for other_row in columns[column]:
                for other_column in rows[other_row]:
                    if other_column != column:
                        columns.setdefault(other_column, set()).add(other_row)

    def _search(
        self,
        columns: dict[int, set[tuple[int, int, int]]],
        rows: dict[tuple[int, int, int], tuple[int, int, int, int]],
        solution: list[tuple[int, int, int]],
    ) -> list[tuple[int, int, int]] | None:
        if not columns:
            return list(solution)

        column = min(columns, key=lambda key: len(columns[key]))
        if len(columns[column]) == 0:
            return None

        for row_id in list(columns[column]):
            solution.append(row_id)
            removed_columns = self._select(columns, rows, row_id)
            result = self._search(columns, rows, solution)
            if result is not None:
                return result
            self._deselect(columns, rows, row_id, removed_columns)
            solution.pop()
        return None

    def solve(self, grid: list[list[int]]) -> list[list[int]] | None:
        if not validate_grid(grid):
            return None

        rows, columns = self._build_exact_cover(grid)
        solution = self._search(columns, rows, [])
        if solution is None:
            return None

        solved = [list(row) for row in grid]
        for row, col, digit in solution:
            solved[row][col] = digit
        return solved


def validate_grid(grid: list[list[int]]) -> bool:
    for row in range(9):
        row_values = [value for value in grid[row] if value != 0]
        if len(row_values) != len(set(row_values)):
            return False

    for col in range(9):
        col_values = [grid[row][col] for row in range(9) if grid[row][col] != 0]
        if len(col_values) != len(set(col_values)):
            return False

    for box_row in range(0, 9, 3):
        for box_col in range(0, 9, 3):
            values = []
            for row in range(box_row, box_row + 3):
                for col in range(box_col, box_col + 3):
                    value = grid[row][col]
                    if value != 0:
                        values.append(value)
            if len(values) != len(set(values)):
                return False
    return True


def find_conflicts(grid: list[list[int]]) -> set[tuple[int, int]]:
    conflicts: set[tuple[int, int]] = set()

    for row in range(9):
        seen: dict[int, list[int]] = {}
        for col in range(9):
            value = grid[row][col]
            if value == 0:
                continue
            seen.setdefault(value, []).append(col)
        for cols in seen.values():
            if len(cols) > 1:
                for col in cols:
                    conflicts.add((row, col))

    for col in range(9):
        seen: dict[int, list[int]] = {}
        for row in range(9):
            value = grid[row][col]
            if value == 0:
                continue
            seen.setdefault(value, []).append(row)
        for rows in seen.values():
            if len(rows) > 1:
                for row in rows:
                    conflicts.add((row, col))

    for box_row in range(0, 9, 3):
        for box_col in range(0, 9, 3):
            seen: dict[int, list[tuple[int, int]]] = {}
            for row in range(box_row, box_row + 3):
                for col in range(box_col, box_col + 3):
                    value = grid[row][col]
                    if value == 0:
                        continue
                    seen.setdefault(value, []).append((row, col))
            for cells in seen.values():
                if len(cells) > 1:
                    conflicts.update(cells)

    return conflicts
