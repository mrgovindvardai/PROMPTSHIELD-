import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_ID = "protectai/deberta-v3-base-prompt-injection-v2"

_tokenizer = None
_model = None
_injection_label_id = None


def _load_model():
    """Load the tokenizer and classifier once, then reuse them."""
    global _tokenizer, _model, _injection_label_id

    if _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        _model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_ID,
            use_safetensors=True,
        )
        _model.eval()

        labels = {
            int(label_id): label_name.upper()
            for label_id, label_name in _model.config.id2label.items()
        }

        _injection_label_id = next(
            (
                label_id
                for label_id, label_name in labels.items()
                if label_name == "INJECTION"
            ),
            None,
        )

        if _injection_label_id is None:
            raise RuntimeError(
                f"Could not find INJECTION label in model labels: {labels}"
            )

    return _tokenizer, _model, _injection_label_id


def score_prompt(text: str) -> float:
    """Return the model's injection score as a float from 0.0 to 1.0."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")

    tokenizer, model, injection_label_id = _load_model()
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    )

    with torch.inference_mode():
        logits = model(**inputs).logits
        probabilities = torch.softmax(logits, dim=-1)[0]

    return float(probabilities[injection_label_id].item())
