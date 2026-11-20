import json
import re
from typing import Any
from openai import OpenAI
from app.config import settings

def get_openai_client() -> OpenAI | None:
    """Initializes OpenAI client configured with Azure AI endpoint and API key."""
    endpoint = settings.OPENAI_BASE_URL
    api_key = settings.OPENAI_API_KEY

    # Check for placeholder or empty key
    if not api_key or "<your-api-key>" in api_key or "your-api-key" in api_key:
        return None

    try:
        return OpenAI(
            base_url=endpoint,
            api_key=api_key,
            timeout=5.0
        )
    except Exception as e:
        print(f"[OpenAIClient] Initialization error: {e}")
        return None

async def run_agent_with_responses_api(
    instructions: str,
    input_text: str,
    tools: list[dict[str, Any]] | None = None,
    tool_executor: Any = None
) -> dict[str, Any] | None:
    """Executes agent using client.responses.create with instructions, input, and tools."""
    client = get_openai_client()
    if not client:
        return None

    deployment_name = settings.MODEL_DEPLOYMENT

    try:
        # First attempt using client.responses.create (OpenAI Responses API)
        kwargs: dict[str, Any] = {
            "model": deployment_name,
            "instructions": instructions,
            "input": input_text,
        }

        if tools:
            # Transform tool definitions if needed for responses endpoint
            kwargs["tools"] = tools

        response = client.responses.create(**kwargs)

        # Extract text content from responses output
        output_str = ""
        if hasattr(response, "output_text") and response.output_text:
            output_str = response.output_text
        elif hasattr(response, "output") and response.output:
            for item in response.output:
                if hasattr(item, "content") and item.content:
                    if isinstance(item.content, list):
                        output_str = "".join(str(c.text if hasattr(c, "text") else c) for c in item.content)
                    else:
                        output_str = str(item.content)
                    break
                elif hasattr(item, "text") and item.text:
                    output_str = str(item.text)
                    break
            if not output_str:
                output_str = str(response.output[-1])

        if not output_str and hasattr(response, "text"):
            output_str = str(response.text)

        # Parse JSON
        clean_text = output_str.strip()
        if "```json" in clean_text:
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_text:
            clean_text = clean_text.split("```")[1].split("```")[0].strip()

        return json.loads(clean_text)

    except Exception as e:
        # Fallback to chat completions if responses endpoint variant returns formatting diff
        try:
            messages = [
                {"role": "system", "content": instructions},
                {"role": "user", "content": input_text}
            ]
            chat_kwargs: dict[str, Any] = {
                "model": deployment_name,
                "messages": messages,
                "temperature": 0.1
            }
            if tools:
                chat_kwargs["tools"] = tools

            chat_resp = client.chat.completions.create(**chat_kwargs)
            msg = chat_resp.choices[0].message
            content = msg.content or ""
            clean_text = content.strip()
            if "```json" in clean_text:
                clean_text = clean_text.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_text:
                clean_text = clean_text.split("```")[1].split("```")[0].strip()
            return json.loads(clean_text)
        except Exception as e_inner:
            print(f"[OpenAIResponses] Cloud execution failed ({e_inner}), falling back to deterministic rubric engine.")
            return None
