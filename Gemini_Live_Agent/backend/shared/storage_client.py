from google.cloud import storage
import asyncio

async def upload_file(bucket_name: str, destination_path: str, file_data: bytes, content_type: str) -> str:
    """Uploads a file to the bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_path)
    
    await asyncio.to_thread(
        blob.upload_from_string,
        file_data,
        content_type=content_type
    )
    return f"gs://{bucket_name}/{destination_path}"

async def download_file(bucket_name: str, source_path: str) -> bytes:
    """Downloads a file from the bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_path)
    
    return await asyncio.to_thread(blob.download_as_bytes)

async def test_connection(bucket_name: str) -> bool:
    """Tests the Cloud Storage connection by uploading and deleting a small file."""
    try:
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob("test_connection.txt")
        
        await asyncio.to_thread(
            blob.upload_from_string,
            b"test",
            content_type="text/plain"
        )
        await asyncio.to_thread(blob.delete)
        return True
    except Exception as e:
        print(f"Storage connection test failed: {e}")
        return False
