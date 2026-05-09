from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from elevenlabs.client import ElevenLabs
import os

router = APIRouter()

_client: ElevenLabs | None = None


def _get_client() -> ElevenLabs:
    global _client
    if _client is None:
        _client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
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
