from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ChatIn(BaseModel):
    messages: list[dict]


@router.post("")
def chat(payload: ChatIn) -> dict:
    # P4: Claude tool-use loop with tools defined in agent/tools.py
    return {"role": "assistant", "content": "TODO: wire Claude tool-use"}
