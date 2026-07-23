from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017/ascendly"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-secret-change-me"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 30
    frontend_url: str = "http://localhost:3000"
    api_base_url: str = "http://localhost:8000"
    environment: str = "development"
    google_service_account_json: str = ""
    drive_root_folder_id: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    paypal_client_id: str = ""
    paypal_client_secret: str = ""
    paypal_webhook_id: str = ""
    sms_provider_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    from_email: str = "noreply@ascendly.io"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    public_stats_min_courses: int = 2000
    public_stats_min_members: int = 50000
    public_stats_min_hours: int = 1200000
    public_stats_min_rating: float = 4.8

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
