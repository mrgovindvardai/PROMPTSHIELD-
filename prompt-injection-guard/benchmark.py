import csv
import re
from pathlib import Path

from model_scorer import score_prompt


def read_cases():
    source = Path(__file__).with_name("benchmark_prompts.txt")
    lines = source.read_text(encoding="utf-8-sig").splitlines()

    cases = []
    current_number = None
    prompt_parts = []

    for line in lines:
        prompt_match = re.match(r"^\s*(\d+)\.\s*Prompt:\s*(.*)$", line)
        expected_match = re.match(
            r"^\s*Expected Result:\s*(Allow|Flag|Block)\s*$",
            line,
            re.IGNORECASE,
        )

        if prompt_match:
            if current_number is not None:
                raise ValueError(f"Case {current_number} is missing its expected result.")
            current_number = int(prompt_match.group(1))
            prompt_parts = [prompt_match.group(2).strip()]

        elif expected_match and current_number is not None:
            prompt = " ".join(part for part in prompt_parts if part).strip()
            cases.append({
                "number": current_number,
                "prompt": prompt,
                "expected": expected_match.group(1).title(),
            })
            current_number = None
            prompt_parts = []

        elif current_number is not None and line.strip():
            prompt_parts.append(line.strip())

    if current_number is not None:
        raise ValueError(f"Case {current_number} is missing its expected result.")
    if len(cases) != 40:
        raise ValueError(f"Found {len(cases)} cases; expected 40.")

    return cases


def main():
    cases = read_cases()
    results_path = Path(__file__).with_name("benchmark_results.csv")
    results = []

    for index, case in enumerate(cases, start=1):
        score = score_prompt(case["prompt"])
        result = {
            **case,
            "injection_score": score,
        }
        results.append(result)
        print(
            f'{index:02}/40  expected={case["expected"]:5}  '
            f'score={score:.6f}'
        )

    with results_path.open("w", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(
            output_file,
            fieldnames=["number", "expected", "injection_score", "prompt"],
        )
        writer.writeheader()
        writer.writerows(results)

    print(f"\nSaved scores to: {results_path}")

    for expected in ("Allow", "Flag", "Block"):
        scores = [
            row["injection_score"]
            for row in results
            if row["expected"] == expected
        ]
        if scores:
            average = sum(scores) / len(scores)
            print(f"Average score for {expected}: {average:.6f} ({len(scores)} cases)")


if __name__ == "__main__":
    main()