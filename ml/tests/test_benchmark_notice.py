from benchmark_eval import run_ablation_benchmark


def test_benchmark_only_describes_unmeasured_plan(capsys):
    run_ablation_benchmark()
    output = capsys.readouterr().out
    assert "NOT MEASURED" in output
    assert "모델을 평가하지 않으며" in output
    assert "94.8" not in output
    assert "improved" not in output
    assert "%" not in output
