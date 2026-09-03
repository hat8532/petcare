import json

from app.rag_retriever import RagCorpusError, RagRetriever


def write_corpus(path, documents):
    path.write_text(
        json.dumps(
            {
                "schemaVersion": "petcare-rag-corpus@1",
                "corpusId": "test-corpus",
                "version": "1",
                "documents": documents,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


def document(source_id, species, keywords, content, source_url="https://example.org/source"):
    return {
        "id": source_id,
        "species": species,
        "areas": ["SKIN"],
        "title": f"{source_id} title",
        "publisher": "Test Veterinary Source",
        "sourceUrl": source_url,
        "sourceSection": "Test section",
        "accessedAt": "2026-09-03",
        "licenseStatus": "link-and-original-paraphrase-only",
        "keywords": keywords,
        "content": content,
    }


def test_retrieves_relevant_evidence_and_filters_species(tmp_path):
    corpus_path = tmp_path / "corpus.json"
    write_corpus(
        corpus_path,
        [
            document(
                "dog-itch",
                ["DOG"],
                ["가려움", "긁음", "알레르기"],
                "개가 계속 긁는 증상은 여러 피부 원인과 관련될 수 있다.",
            ),
            document(
                "cat-hair-loss",
                ["CAT"],
                ["탈모", "그루밍"],
                "고양이의 과도한 그루밍과 탈모를 함께 관찰한다.",
            ),
        ],
    )

    results = RagRetriever(corpus_path).search("DOG", "SKIN", "가려움 때문에 계속 긁음")

    assert [result.source_id for result in results] == ["dog-itch"]
    assert results[0].score > 0


def test_rejects_unsafe_source_url(tmp_path):
    corpus_path = tmp_path / "corpus.json"
    write_corpus(
        corpus_path,
        [document("unsafe", ["DOG"], ["가려움"], "피부 증상", "http://example.org")],
    )

    try:
        RagRetriever(corpus_path).metadata()
        raise AssertionError("RagCorpusError was not raised")
    except RagCorpusError as error:
        assert error.failure_code == "RAG_CORPUS_UNAVAILABLE"


def test_default_corpus_has_retrievable_authoritative_sources():
    retriever = RagRetriever()

    metadata = retriever.metadata()
    results = retriever.search("DOG", "SKIN", "가려움 긁음 붉은 피부와 탈모")

    assert metadata.corpus_id == "veterinary-skin-prototype-ko"
    assert metadata.document_count >= 5
    assert results
    assert all(result.source_url.startswith("https://") for result in results)


def test_unrelated_query_does_not_match_only_from_species_or_area(tmp_path):
    corpus_path = tmp_path / "corpus.json"
    write_corpus(
        corpus_path,
        [document("dog-itch", ["DOG"], ["가려움"], "피부 가려움과 긁음을 관찰한다.")],
    )

    results = RagRetriever(corpus_path).search(
        "DOG",
        "SKIN",
        "완전히무관한입력 우주선 자동차",
    )

    assert results == []
