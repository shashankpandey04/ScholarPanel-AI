import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Load .env file
load_dotenv(dotenv_path=BASE_DIR / ".env")

class Settings:
    FOUNDRY_PROJECT_ENDPOINT: str = os.getenv("FOUNDRY_PROJECT_ENDPOINT", "").strip()
    FOUNDRY_MODEL_DEPLOYMENT: str = os.getenv("FOUNDRY_MODEL_DEPLOYMENT", "gpt-4o").strip()

    # Paths and server configs
    APP_NAME: str = "ScholarPanel AI - Azure AI Foundry Multi-Agent Evaluator"
    DEBUG: bool = True
    RUBRIC_PATH: str = str(DATA_DIR / "published_rubric.md")
    SAMPLES_PATH: str = str(DATA_DIR / "sample_applications.json")
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

settings = Settings()
