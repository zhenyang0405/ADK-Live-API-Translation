from google.cloud import firestore

# Initialize the async client
db = firestore.AsyncClient()

async def read_document(collection: str, doc_id: str) -> dict | None:
    doc_ref = db.collection(collection).document(doc_id)
    doc = await doc_ref.get()
    if doc.exists:
        return doc.to_dict()
    return None

async def write_document(collection: str, doc_id: str, data: dict) -> None:
    doc_ref = db.collection(collection).document(doc_id)
    await doc_ref.set(data)

async def test_connection() -> bool:
    try:
        test_doc_ref = db.collection("_system_test").document("connection_test")
        await test_doc_ref.set({"status": "ok"})
        doc = await test_doc_ref.get()
        return doc.exists
    except Exception as e:
        print(f"Firestore connection test failed: {e}")
        return False
