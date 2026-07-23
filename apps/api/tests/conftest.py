import os
import pytest

os.environ["MONGODB_URI"] = "memory://test"


@pytest.fixture(autouse=True)
def reset_db_and_cache():
    from app.db import mongodb
    from app.services import cache

    mongodb.memory_db = mongodb.InMemoryDB()
    cache._cache = None
