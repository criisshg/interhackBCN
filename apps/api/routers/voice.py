import os
from typing import Any

from fastapi import APIRouter
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

_client: Any | None = None


def _get_client() -> Any:
    global _client
    if _client is None:
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        if not api_key:
            raise HTTPException(status_code=503, detail="ELEVENLABS_API_KEY is not configured")
        try:
            from elevenlabs.client import ElevenLabs
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="ElevenLabs dependency is not installed") from exc

        _client = ElevenLabs(api_key=api_key)
    return _client


class VoiceIn(BaseModel):
    text: str
    voice_id: str | None = None


@router.post("")
def voice(payload: VoiceIn) -> StreamingResponse:
    voice_id = payload.voice_id or os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    audio_stream = _get_client().text_to_speech.convert_as_stream(
        voice_id=voice_id,
        text=payload.text,
        model_id="eleven_multilingual_v2",
    )
    return StreamingResponse(audio_stream, media_type="audio/mpeg")
