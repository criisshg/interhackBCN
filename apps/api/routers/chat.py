import os
import json
from fastapi import APIRouter
from pydantic import BaseModel
import google.generativeai as genai

from agent.system_prompt import SYSTEM_PROMPT
from agent.tools import TOOLS

router = APIRouter()


def _execute_tool(name: str, args: dict) -> str:
    """Stub implementations — P4 fills these in with real DB queries."""
    if name == "get_alerts":
        return json.dumps({"alerts": [], "note": "TODO: query DB"})
    if name == "get_client":
        return json.dumps({"client_id": args.get("client_id"), "note": "TODO: query DB"})
    if name == "explain_alert":
        return json.dumps({"alert_id": args.get("alert_id"), "note": "TODO: query DB"})
    if name == "draft_outreach":
        return json.dumps({"client_id": args.get("client_id"), "intent": args.get("intent"), "note": "TODO: generate"})
    return json.dumps({"error": f"unknown tool: {name}"})


class ChatIn(BaseModel):
    messages: list[dict]


@router.post("")
def chat(payload: ChatIn) -> dict:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(
        model_name=os.environ.get("GEMINI_MODEL", "gemini-2.0-flash"),
        tools=TOOLS,
        system_instruction=SYSTEM_PROMPT,
    )
    history = [
        {"role": m["role"], "parts": [m["content"]]}
        for m in payload.messages[:-1]
    ]
    last_user = payload.messages[-1]["content"]

    session = model.start_chat(history=history)
    response = session.send_message(last_user)

    # Tool-use loop
    while response.candidates[0].content.parts[0].function_call.name:
        part = response.candidates[0].content.parts[0]
        fn_name = part.function_call.name
        fn_args = dict(part.function_call.args)
        result = _execute_tool(fn_name, fn_args)
        response = session.send_message(
            genai.protos.Content(
                parts=[genai.protos.Part(
                    function_response=genai.protos.FunctionResponse(
                        name=fn_name,
                        response={"result": result},
                    )
                )],
                role="tool",
            )
        )

    text = response.text
    return {"role": "assistant", "content": text}
