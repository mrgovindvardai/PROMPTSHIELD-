import statistics
import time
import torch
torch.set_num_threads(9)

from model_scorer import score_prompt

prompt = "What is the weather today?"

# Load and warm up the model first; don't count this time.
score_prompt(prompt)

times_ms = []
for _ in range(20):
    start = time.perf_counter()
    score_prompt(prompt)
    times_ms.append((time.perf_counter() - start) * 1000)

times_ms.sort()
p95_index = int(0.95 * (len(times_ms) - 1))

print(f"Average: {statistics.mean(times_ms):.1f} ms")
print(f"Median:  {statistics.median(times_ms):.1f} ms")
print(f"P95:     {times_ms[p95_index]:.1f} ms")