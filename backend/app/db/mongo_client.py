from pymongo import MongoClient
from app.core.config import MONGO_URI, DB_NAME

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
screenings_collection = db["screenings"]