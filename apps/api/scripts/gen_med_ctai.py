import json, os
BANK = "apps/web/question-bank"
EXAM = "istqb-ct-ai"
PRE = "ISTQB-CTAI-MED"
EZ = os.path.join(BANK, EXAM, "medium.json")
EX = os.path.join(BANK, EXAM, "medium_extra.json")
meta = json.load(open(EZ, encoding="utf-8"))
Q = []
N = 86
def q(dom, ques, a, b, c, d, ans, exp):
    global N
    Q.append({"id": f"{PRE}-{N:04d}", "difficulty": "medium", "type": "MCQ", "domain": dom, "question": ques, "options": {"A": a, "B": b, "C": c, "D": d}, "correct_answer": [ans], "explanation": exp})
    N += 1
q("Introduction to AI", "A team can't define exact expected outputs for an AI classifier; which testing approach fits best?", "Metamorphic relations and statistical acceptance thresholds", "Exact string matching only", "Skip testing", "Manual eyeballing only", "A", "Metamorphic and statistical oracles handle non-determinism.")
q("Introduction to AI", "Bias discovered against a subgroup after launch; what first?", "Analyze root causes in data, features, and thresholds; retrain or adjust", "Ignore the subgroup", "Ship immediately", "Hide the metric", "A", "Root-cause analysis drives fair fixes.")
q("Quality Characteristics for AI-Based Systems", "Monitoring shows accuracy decay weekly; what is most likely?", "Drift in data or concept relationship", "Code never changes", "Users love it", "Monitoring is wrong", "A", "Drift causes slow decay.")
q("Quality Characteristics for AI-Based Systems", "Which metric set suits a fraud model where false negatives are costly?", "High recall priority with precision floor", "Accuracy only", "Latency only", "Model size only", "A", "Recall-first with floors protects customers.")
q("Machine Learning Overview", "Validation loss rises while training loss falls; what is happening?", "Overfitting after a sweet spot", "Perfect learning", "Data too small to use", "Learning rate zero", "A", "Divergence indicates overfit.")
q("Machine Learning Overview", "Class imbalance 99:1 with 95% accuracy; is the model good?", "No; it may never predict the minority class", "Yes, 95% is great", "Accuracy is enough", "Imbalance is irrelevant", "A", "Minority metrics matter more.")
q("Machine Learning Overview", "Which split strategy suits time-series data?", "Time-based rolling splits", "Random shuffle splits", "No split needed", "K-fold on future data", "A", "Time leakage ruins random splits.")
q("Machine Learning Overview", "Why cross-validate before trusting a single test score?", "Single splits can mislead", "Cross-val fills time", "One split always right", "Scores never vary", "A", "Multiple folds stabilize estimates.")
q("Testing AI-Based Systems", "Model outputs vary run to run; what test design accounts for it?", "Multiple runs with aggregated pass criteria", "One run decides", "Ignore variance", "Lock all outputs", "A", "Aggregation handles sampling noise.")
q("Testing AI-Based Systems", "An image classifier mislabels rotated images; what testing would catch this?", "Metamorphic rotation invariance tests", "Latency tests", "UI tests", "Load tests", "A", "Invariance relations expose gaps.")
q("Testing AI-Based Systems", "Shadow mode shows new model worse; what next?", "Do not promote; investigate differences", "Promote anyway", "Delete metrics", "Blame users", "A", "Evidence gates promotion.")
q("Input Data Testing for ML Systems", "Feature distribution shifts between train and prod; what risks?", "Silent performance degradation", "Nothing changes", "Training speeds up", "Logs fill faster", "A", "Shift breaks learned assumptions.")
q("Input Data Testing for ML Systems", "Training-serving skew found; what fixes it?", "Unify preprocessing in shared code", "Ignore skew", "Train more epochs", "Buy hardware", "A", "Shared transforms kill skew.")
q("Model Testing for ML Systems", "Calibration curve shows overconfidence; what helps?", "Platt scaling or isotonic calibration", "More epochs", "Bigger model", "Ignore confidence", "A", "Post-hoc calibration fixes confidence.")
q("Model Testing for ML Systems", "Subgroup recall differs wildly; what follows?", "Slice-based evaluation plus targeted retraining", "Report only averages", "Hide slices", "Ship anyway", "A", "Slices expose inequity.")
out = {"exam_name": meta["exam_name"], "exam_code": meta["exam_code"], "duration_minutes": meta["duration_minutes"], "live_exam_question_count": meta["live_exam_question_count"], "difficulty_tier": "medium", "questions_in_this_file": len(Q), "target_for_tier": 100, "last_updated": "2026", "questions": Q}
json.dump(out, open(EX, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
print(f"WROTE {EX} questions={len(Q)}")