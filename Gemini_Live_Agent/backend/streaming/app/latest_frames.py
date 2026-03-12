# Module-level store for the latest document frame per session
# Maps session_id -> bytes (JPEG)
latest_frames: dict[str, bytes] = {}
