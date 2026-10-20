import os

from pymongo import ASCENDING, DESCENDING, MongoClient

_client = None
_database = None


def init_db():
    global _client, _database

    client = MongoClient(
        os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        tz_aware=True,
        serverSelectionTimeoutMS=3000,
    )
    client.admin.command("ping")
    database = client[os.getenv("MONGO_DB_NAME", "reviewdb")]
    reviews = database["reviews"]
    reviews.create_index(
        [("user_id", ASCENDING), ("product_id", ASCENDING)],
        unique=True,
    )
    reviews.create_index([
        ("product_id", ASCENDING),
        ("created_at", DESCENDING),
        ("_id", DESCENDING),
    ])

    _client = client
    _database = database


def get_collection():
    if _database is None:
        raise RuntimeError("Database belum diinisialisasi")
    return _database["reviews"]
