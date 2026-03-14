from __future__ import annotations

import argparse
import json

from .config import SelfLearningConfig
from .dashboard import generate_dashboard
from .pipeline import SelfLearningSudokuSystem
from .training import SelfLearningTrainer


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Self-learning Sudoku OCR system")
    sub = parser.add_subparsers(dest="command", required=True)

    process = sub.add_parser("process", help="Process a Sudoku image and harvest feedback samples")
    process.add_argument("image_path", help="Path to a Sudoku photo or scan")
    process.add_argument("--auto-retrain", action="store_true", help="Retrain automatically when enough new samples exist")

    sub.add_parser("retrain", help="Retrain all detector and recognizer models")
    sub.add_parser("dashboard", help="Generate the latest HTML dashboard from metrics")
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    config = SelfLearningConfig()

    if args.command == "process":
        system = SelfLearningSudokuSystem(config)
        result = system.process_image(args.image_path, auto_retrain=args.auto_retrain)
        print(json.dumps(result.to_dict(), indent=2))
        return

    if args.command == "retrain":
        trainer = SelfLearningTrainer(config)
        summary = trainer.retrain_all()
        print(json.dumps(summary, indent=2))
        return

    if args.command == "dashboard":
        report_path = generate_dashboard(config)
        print(str(report_path))


if __name__ == "__main__":
    main()
