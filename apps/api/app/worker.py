from redis import Redis
from rq import Queue, Worker

from app.settings import settings


def main() -> None:
    connection = Redis.from_url(settings.redis_url)
    queue = Queue("analysis", connection=connection)
    Worker([queue], connection=connection).work()


if __name__ == "__main__":
    main()
