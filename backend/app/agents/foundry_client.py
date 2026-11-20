import os
import json
from typing import Any
from app.config import settings

def get_foundry_openai_client():
    """Initializes Azure AI Foundry client via AIProjectClient and DefaultAzureCredential if configured."""
    endpoint = settings.FOUNDRY_PROJECT_ENDPOINT
    if not endpoint or "your-resource" in endpoint or "example" in endpoint:
        return None

    try:
        from azure.ai.projects import AIProjectClient
        from azure.identity import DefaultAzureCredential
        
        project_client = AIProjectClient(
            endpoint=endpoint,
            credential=DefaultAzureCredential()
        )
        return project_client.get_openai_client()
    except Exception as e:
        print(f"[FoundryClient] Failed to initialize Azure AI Foundry client: {e}")
        return None

async def run_foundry_agent_completion(
    system_prompt: str,
    user_prompt: str,
    tools: list[dict[str, Any]] | None = None,
    tool_executor: Any = None,
    response_schema: Any = None
) -> dict[str, Any] | None:
    """Invokes Azure AI Foundry deployment with system prompt, tool calling, and structured outputs."""
    client = get_foundry_openai_client()
    if not client:
        return None

    deployment_name = settings.FOUNDRY_MODEL_DEPLOYMENT
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    try:
        kwargs: dict[str, Any] = {
            "model": deployment_name,
            "messages": messages,
            "temperature": 0.1,
        }

        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        response = client.chat.completions.create(**kwargs)
        message = response.choices[0].message

        # Handle tool calls if any
        if message.tool_calls and tool_executor:
            messages.append(message)
            for tool_call in message.tool_calls:
                func_name = tool_call.function.name
                func_args = json.loads(tool_call.function.arguments)
                tool_output = tool_executor(func_name, func_args)

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(tool_output)
                })

            # Second turn to obtain final structured response after tool results
            second_resp = client.chat.completions.create(
                model=deployment_name,
                messages=messages,
                temperature=0.1
            )
            final_text = second_resp.choices[0].message.content or ""
        else:
            final_text = message.content or ""

        # Attempt to parse json from response
        clean_text = final_text.strip()
        if "```json" in clean_text:
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_text:
            clean_text = clean_text.split("```")[1].split("```")[0].strip()

        return json.loads(clean_text)
    except Exception as e:
        print(f"[FoundryAgent] Cloud execution error ({e}), utilizing deterministic rubric engine.")
        return None
