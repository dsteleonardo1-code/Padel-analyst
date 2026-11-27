from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str = "sqlite+pysqlite:///./data/fondocampo.sqlite"
    redis_url: str = "redis://localhost:6379/0"
    inline_jobs: bool = True
    s3_enabled: bool = False
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "fondocampo"
    s3_secret_key: str = "fondocampo-secret"
    s3_bucket: str = "videos"
    data_dir: str = "./data"


settings = Settings()
