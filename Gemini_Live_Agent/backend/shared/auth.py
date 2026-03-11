import firebase_admin
from firebase_admin import auth as firebase_auth
import asyncio

# Initialize Firebase Admin app using Application Default Credentials
if not firebase_admin._apps:
    firebase_admin.initialize_app()

async def verify_token(token: str) -> str:
    """
    Verifies a Firebase ID token and returns the uid.
    Raises ValueError if verification fails.
    """
    try:
        decoded_token = await asyncio.to_thread(
            firebase_auth.verify_id_token, token
        )
        return decoded_token['uid']
    except Exception as e:
        raise ValueError(f"Invalid token: {e}")
