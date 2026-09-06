import json
import math
import os
import re
from collections import Counter
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse


DEFAULT_CORPUS_PATH = (
    Path(__file__).resolve().parents[1]
    / "knowledge"
    / "veterinary_skin_prototype.json"
)
TOKEN_PATTERN = re.compile(r"[a-z0-9]+|[가-힣]+", re.IGNORECASE)
ALLOWED_SPECIES = {"DOG", "CAT"}
ALLOWED_AREAS = {"SKIN"}


class RagCorpusError(Exception):
    def __init__(self, failure_code: str = "RAG_CORPUS_UNAVAILABLE"):
        super().__init__(failure_code)
        self.failure_code = failure_code


@dataclass(frozen=True)
class RagEvidence:
    source_id: str
    title: str
    publisher: str
    source_url: str
    excerpt: str
    score: float


@dataclass(frozen=True)
class RagCorpusMetadata:
    corpus_id: str
    version: str
    document_count: int


@dataclass(frozen=True)
class _CorpusDocument:
    source_id: str
    species: tuple[str, ...]
    areas: tuple[str, ...]
    title: str
    publisher: str
    source_url: str
    keywords: tuple[str, ...]
    content: str


@dataclass(frozen=True)
class _Corpus:
    metadata: RagCorpusMetadata
    documents: tuple[_CorpusDocument, ...]


class RagRetriever:
    def __init__(self, corpus_path: str | Path = DEFAULT_CORPUS_PATH) -> None:
        self.corpus_path = Path(corpus_path).expanduser().resolve()

    @classmethod
    def from_environment(cls) -> "RagRetriever":
        configured_path = os.getenv("PETCARE_RAG_CORPUS", "").strip()
        return cls(configured_path or DEFAULT_CORPUS_PATH)

    def metadata(self) -> RagCorpusMetadata:
        return _load_corpus(str(self.corpus_path)).metadata

    def search(
        self,
        species: str,
        affected_area: str,
        query: str,
        limit: int = 3,
    ) -> list[RagEvidence]:
        corpus = _load_corpus(str(self.corpus_path))
        normalized_species = species.strip().upper()
        normalized_area = affected_area.strip().upper()
        candidates = [
            document
            for document in corpus.documents
            if normalized_species in document.species
            and normalized_area in document.areas
        ]
        query_tokens = _tokenize(query)
        if not candidates or not query_tokens:
            return []

        document_tokens = [_weighted_tokens(document) for document in candidates]
        document_frequency = Counter(
            token
            for tokens in document_tokens
            for token in set(tokens)
        )
        inverse_document_frequency = {
            token: math.log((1 + len(candidates)) / (1 + frequency)) + 1
            for token, frequency in document_frequency.items()
        }
        query_vector = _tf_idf_vector(query_tokens, inverse_document_frequency)

        ranked: list[RagEvidence] = []
        for document, tokens in zip(candidates, document_tokens, strict=True):
            score = _cosine_similarity(
                query_vector,
                _tf_idf_vector(tokens, inverse_document_frequency),
            )
            if score <= 0:
                continue
            ranked.append(
                RagEvidence(
                    source_id=document.source_id,
                    title=document.title,
                    publisher=document.publisher,
                    source_url=document.source_url,
                    excerpt=document.content,
                    score=round(score, 6),
                )
            )

        ranked.sort(key=lambda evidence: (-evidence.score, evidence.source_id))
        return ranked[: max(1, min(limit, 5))]


def _tokenize(value: str) -> list[str]:
    return [token.lower() for token in TOKEN_PATTERN.findall(value)]


def _weighted_tokens(document: _CorpusDocument) -> list[str]:
    keywords = [
        token
        for keyword in document.keywords
        for token in _tokenize(keyword)
    ]
    return _tokenize(document.title) + _tokenize(document.content) + keywords + keywords


def _tf_idf_vector(tokens: list[str], inverse_document_frequency: dict[str, float]) -> dict[str, float]:
    counts = Counter(token for token in tokens if token in inverse_document_frequency)
    if not counts:
        return {}
    maximum_count = max(counts.values())
    return {
        token: (count / maximum_count) * inverse_document_frequency[token]
        for token, count in counts.items()
    }


def _cosine_similarity(left: dict[str, float], right: dict[str, float]) -> float:
    if not left or not right:
        return 0.0
    dot_product = sum(value * right.get(token, 0.0) for token, value in left.items())
    left_norm = math.sqrt(sum(value * value for value in left.values()))
    right_norm = math.sqrt(sum(value * value for value in right.values()))
    return dot_product / (left_norm * right_norm) if left_norm and right_norm else 0.0


@lru_cache(maxsize=4)
def _load_corpus(path_value: str) -> _Corpus:
    try:
        raw = json.loads(Path(path_value).read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise ValueError("corpus must be an object")
        if raw.get("schemaVersion") != "petcare-rag-corpus@1":
            raise ValueError("unsupported schema")
        corpus_id = _required_text(raw, "corpusId", 100)
        version = _required_text(raw, "version", 40)
        documents_raw = raw.get("documents")
        if not isinstance(documents_raw, list) or not 1 <= len(documents_raw) <= 20:
            raise ValueError("invalid document count")

        documents: list[_CorpusDocument] = []
        source_ids: set[str] = set()
        for item in documents_raw:
            if not isinstance(item, dict):
                raise ValueError("invalid document")
            source_id = _required_text(item, "id", 100)
            if source_id in source_ids:
                raise ValueError("duplicate document id")
            source_ids.add(source_id)

            species = _string_list(item, "species", 2, 10)
            areas = _string_list(item, "areas", 4, 30)
            if not set(species).issubset(ALLOWED_SPECIES):
                raise ValueError("unsupported species")
            if not set(areas).issubset(ALLOWED_AREAS):
                raise ValueError("unsupported area")

            source_url = _required_text(item, "sourceUrl", 500)
            parsed_url = urlparse(source_url)
            if parsed_url.scheme != "https" or not parsed_url.hostname or parsed_url.username:
                raise ValueError("unsafe source url")
            _required_text(item, "sourceSection", 200)
            date.fromisoformat(_required_text(item, "accessedAt", 10))
            if _required_text(item, "licenseStatus", 80) != "link-and-original-paraphrase-only":
                raise ValueError("unsupported license status")

            documents.append(
                _CorpusDocument(
                    source_id=source_id,
                    species=tuple(species),
                    areas=tuple(areas),
                    title=_required_text(item, "title", 200),
                    publisher=_required_text(item, "publisher", 160),
                    source_url=source_url,
                    keywords=tuple(_string_list(item, "keywords", 30, 80)),
                    content=_required_text(item, "content", 2000),
                )
            )

        return _Corpus(
            metadata=RagCorpusMetadata(corpus_id, version, len(documents)),
            documents=tuple(documents),
        )
    except (OSError, json.JSONDecodeError, TypeError, ValueError) as exception:
        raise RagCorpusError() from exception


def _required_text(item: dict, field: str, max_length: int) -> str:
    value = item.get(field)
    if not isinstance(value, str) or not value.strip() or len(value) > max_length:
        raise ValueError(f"invalid {field}")
    return value.strip()


def _string_list(item: dict, field: str, max_items: int, max_item_length: int) -> list[str]:
    values = item.get(field)
    if not isinstance(values, list) or not 1 <= len(values) <= max_items:
        raise ValueError(f"invalid {field}")
    normalized = []
    for value in values:
        if not isinstance(value, str) or not value.strip() or len(value) > max_item_length:
            raise ValueError(f"invalid {field} item")
        normalized.append(value.strip().upper() if field in {"species", "areas"} else value.strip())
    return normalized
