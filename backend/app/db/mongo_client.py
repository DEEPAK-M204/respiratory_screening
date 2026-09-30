from pymongo import MongoClient
from app.core.config import MONGO_URI, DB_NAME

# Set serverSelectionTimeoutMS to 3000ms so calls fail fast if MongoDB is offline
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client[DB_NAME]
screenings_collection = db["screenings"]