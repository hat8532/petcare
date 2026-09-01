from dataclasses import dataclass

from fastapi import UploadFile

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_DIMENSION = 8_000
MAX_IMAGE_PIXELS = 25_000_000
READ_CHUNK_BYTES = 64 * 1024


class ImageValidationError(Exception):
    def __init__(self, status_code: int, failure_code: str):
        super().__init__(failure_code)
        self.status_code = status_code
        self.failure_code = failure_code


@dataclass(frozen=True)
class ValidatedUpload:
    content: bytes
    mime_type: str
    width: int
    height: int


async def read_validated_image(image: UploadFile) -> ValidatedUpload:
    # Backend가 WebP를 실제 decode한 뒤 PNG로 정규화하므로 내부 Provider 경계는
    # 자체 decoder가 있는 JPEG/PNG만 받는다.
    if image.content_type not in {"image/jpeg", "image/png"}:
        raise ImageValidationError(415, "UNSUPPORTED_MEDIA_TYPE")

    chunks: list[bytes] = []
    total = 0
    while chunk := await image.read(READ_CHUNK_BYTES):
        total += len(chunk)
        if total > MAX_IMAGE_BYTES:
            raise ImageValidationError(413, "IMAGE_TOO_LARGE")
        chunks.append(chunk)

    content = b"".join(chunks)
    if not content:
        raise ImageValidationError(400, "INVALID_INPUT")

    detected_type, width, height = _inspect_header(content)
    if detected_type != image.content_type:
        raise ImageValidationError(415, "UNSUPPORTED_MEDIA_TYPE")
    if (
        width <= 0
        or height <= 0
        or width > MAX_IMAGE_DIMENSION
        or height > MAX_IMAGE_DIMENSION
        or width * height > MAX_IMAGE_PIXELS
    ):
        raise ImageValidationError(413, "IMAGE_DIMENSIONS_TOO_LARGE")

    return ValidatedUpload(content, detected_type, width, height)


def _inspect_header(content: bytes) -> tuple[str, int, int]:
    try:
        if content.startswith(b"\xff\xd8\xff"):
            width, height = _jpeg_dimensions(content)
            return "image/jpeg", width, height
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            if len(content) < 33 or content[12:16] != b"IHDR" or b"IEND" not in content[-32:]:
                raise ValueError
            width = int.from_bytes(content[16:20], "big")
            height = int.from_bytes(content[20:24], "big")
            return "image/png", width, height
    except (IndexError, ValueError):
        pass
    raise ImageValidationError(400, "INVALID_IMAGE")


def _jpeg_dimensions(content: bytes) -> tuple[int, int]:
    if not content.endswith(b"\xff\xd9"):
        raise ValueError

    position = 2
    start_of_frame = {
        0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
        0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF,
    }
    while position + 3 < len(content):
        while position < len(content) and content[position] != 0xFF:
            position += 1
        while position < len(content) and content[position] == 0xFF:
            position += 1
        if position >= len(content):
            break

        marker = content[position]
        position += 1
        if marker in {0xD8, 0xD9}:
            continue
        if marker == 0xDA or position + 2 > len(content):
            break

        segment_length = int.from_bytes(content[position:position + 2], "big")
        if segment_length < 2 or position + segment_length > len(content):
            raise ValueError
        if marker in start_of_frame:
            if segment_length < 7:
                raise ValueError
            height = int.from_bytes(content[position + 3:position + 5], "big")
            width = int.from_bytes(content[position + 5:position + 7], "big")
            return width, height
        position += segment_length
    raise ValueError
