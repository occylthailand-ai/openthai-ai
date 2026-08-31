"""
Fine-tune WangchanBERTa for Thai commercial NER (QTY / UNIT / BUDGET extraction).

Prerequisites:
    pip install transformers datasets seqeval torch accelerate

Usage:
    python train_ner.py \
        --data_path ../dataset/samples.json \
        --output_dir ./openthaiai-ner-wangchanberta \
        --epochs 3 \
        --batch_size 8
"""

import json
import argparse
from pathlib import Path

import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification,
)
import numpy as np
from seqeval.metrics import classification_report, f1_score

# --------------------------------------------------------------------------- #
# Label definitions — must match dataset/label_schema.json
# --------------------------------------------------------------------------- #
LABEL_LIST = ["O", "B-QTY", "I-QTY", "B-UNIT", "I-UNIT", "B-BUDGET", "I-BUDGET"]
LABEL2ID   = {l: i for i, l in enumerate(LABEL_LIST)}
ID2LABEL   = {i: l for i, l in enumerate(LABEL_LIST)}

BASE_MODEL  = "airesearch/wangchanberta-base-att-spm-uncased"


# --------------------------------------------------------------------------- #
# Subword alignment: propagate the label of the first subtoken only
# --------------------------------------------------------------------------- #
def align_labels_with_tokens(tokenized, labels: list[int]) -> list[int]:
    aligned = []
    prev_word_id = None
    for word_id in tokenized.word_ids():
        if word_id is None:
            aligned.append(-100)          # special token → ignore in loss
        elif word_id != prev_word_id:
            aligned.append(labels[word_id])  # first subtoken → real label
        else:
            aligned.append(-100)          # continuation subtoken → ignored
        prev_word_id = word_id
    return aligned


def tokenize_and_align(examples, tokenizer):
    tokenized = tokenizer(
        examples["tokens"],
        truncation=True,
        is_split_into_words=True,
        padding=False,
    )
    tokenized["labels"] = [
        align_labels_with_tokens(
            tokenizer(
                tokens,
                truncation=True,
                is_split_into_words=True,
            ),
            tags,
        )
        for tokens, tags in zip(examples["tokens"], examples["ner_tags"])
    ]
    return tokenized


# --------------------------------------------------------------------------- #
# Metrics: seqeval F1 (entity-level)
# --------------------------------------------------------------------------- #
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)

    true_labels = [
        [ID2LABEL[l] for l in row if l != -100]
        for row in labels
    ]
    true_preds = [
        [ID2LABEL[p] for p, l in zip(pred_row, label_row) if l != -100]
        for pred_row, label_row in zip(predictions, labels)
    ]

    return {
        "f1": f1_score(true_labels, true_preds),
        "report": classification_report(true_labels, true_preds),
    }


# --------------------------------------------------------------------------- #
# Main training loop
# --------------------------------------------------------------------------- #
def main(args):
    # ── Load dataset ────────────────────────────────────────────────────────
    raw = json.loads(Path(args.data_path).read_text(encoding="utf-8"))
    dataset = Dataset.from_list([
        {"tokens": s["tokens"], "ner_tags": s["ner_tags"]}
        for s in raw
    ])
    split = dataset.train_test_split(test_size=0.2, seed=42)

    # ── Tokenizer ───────────────────────────────────────────────────────────
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)

    tokenized = split.map(
        lambda ex: tokenize_and_align(ex, tokenizer),
        batched=True,
        remove_columns=["tokens", "ner_tags"],
    )

    # ── Model ────────────────────────────────────────────────────────────────
    model = AutoModelForTokenClassification.from_pretrained(
        BASE_MODEL,
        num_labels=len(LABEL_LIST),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )

    # ── Training arguments ───────────────────────────────────────────────────
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=2e-5,
        weight_decay=0.01,
        warmup_ratio=0.1,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        fp16=torch.cuda.is_available(),
        logging_steps=10,
        report_to="none",       # swap to "wandb" for experiment tracking
    )

    # ── Trainer ──────────────────────────────────────────────────────────────
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["test"],
        tokenizer=tokenizer,
        data_collator=DataCollatorForTokenClassification(tokenizer),
        compute_metrics=compute_metrics,
    )

    trainer.train()
    trainer.save_model(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print(f"\n✅ Model saved to {args.output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune WangchanBERTa for Thai NER")
    parser.add_argument("--data_path",  default="../dataset/samples.json")
    parser.add_argument("--output_dir", default="./openthaiai-ner-wangchanberta")
    parser.add_argument("--epochs",     type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=8)
    main(parser.parse_args())
