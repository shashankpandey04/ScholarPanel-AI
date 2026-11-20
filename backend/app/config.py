import os
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Ensure backend root is in sys.path
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Load .env file
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    # OpenAI Responses API Client Configuration
    OPENAI_BASE_URL: str = os.getenv(
        "OPENAI_BASE_URL", 
        os.getenv("AZURE_OPENAI_ENDPOINT", "https://cse476-resource.services.ai.azure.com/openai/v1")
    ).strip()
    
    OPENAI_API_KEY: str = os.getenv(
        "OPENAI_API_KEY", 
        os.getenv("AZURE_OPENAI_API_KEY", "")
    ).strip()
    
    MODEL_DEPLOYMENT: str = os.getenv(
        "MODEL_DEPLOYMENT", 
        os.getenv("FOUNDRY_MODEL_DEPLOYMENT", "gpt-5-mini")
    ).strip()

    # Paths and server configs
    APP_NAME: str = "ScholarPanel AI - Multi-Agent Scholarship Evaluator"
    DEBUG: bool = True
    RUBRIC_PATH: str = str(DATA_DIR / "published_rubric.md")
    SAMPLES_PATH: str = str(DATA_DIR / "sample_applications.json")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

settings = Settings()
