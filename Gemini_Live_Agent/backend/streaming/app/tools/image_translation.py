import asyncio
import os
import uuid

from google import genai
from google.genai import types
from google.adk.tools.tool_context import ToolContext
from google.cloud import firestore

from shared.firestore_client import db
from shared.storage_client import upload_file, generate_signed_url
from streaming.app.active_documents import active_documents
from streaming.app.latest_frames import latest_frames

GCS_BUCKET = os.environ.get("GCS_BUCKET", "")


async def translate_image(
    description: str,
    target_language: str,
    section_id: str = "Image Translation",
    nuance_notes: str = "",
    tool_context: ToolContext = None,
) -> str:
    """Translate text within an image (table, chart, graph, diagram) by editing the image.

    Call this tool when the user asks you to translate visual content where spatial layout
    matters — tables, charts, graphs, diagrams, or any image containing text.

    Args:
        description: Describe what you see in the image and what text needs translating.
        target_language: The language to translate the image text into (e.g. "English", "Chinese").
        section_id: A label for this translation (e.g. "Table 1", "Figure 3").
        nuance_notes: Optional notes about translation choices or cultural context.
    """
    if not tool_context:
        return "Error: No tool context available."

    user_id = tool_context.user_id
    session_id = tool_context.session.id

    # Get the latest document frame
    frame_bytes = latest_frames.get(session_id)
    if not frame_bytes:
        return "Error: No document is currently visible. Please ask the user to open a document first."

    # Call Gemini image generation model to produce translated image
    client = genai.Client()
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-3.1-flash-image-preview",
        contents=[
            types.Content(parts=[
                types.Part.from_bytes(data=frame_bytes, mime_type="image/jpeg"),
                types.Part(text=
                    f"Edit this image: replace ALL text (labels, titles, legends, "
                    f"table headers, axis labels, annotations, body text) with their "
                    f"{target_language} translations. Keep the exact same layout, colors, "
                    f"fonts, and styling. Only change the text language. "
                    f"Do not add or remove any visual elements."
                ),
            ])
        ],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    # Extract image bytes from response
    image_bytes = None
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            image_bytes = part.inline_data.data
            break

    if not image_bytes:
        return "Error: The image generation model did not return an image. Please try again."

    # Upload to Cloud Storage
    blob_path = f"image_translations/{user_id}/{uuid.uuid4().hex}.png"
    await upload_file(GCS_BUCKET, blob_path, image_bytes, "image/png")

    # Generate signed URL (24 hour expiry)
    signed_url = await generate_signed_url(GCS_BUCKET, blob_path, expiration_minutes=1440)

    # Write to Firestore
    doc_name = active_documents.get(session_id, "unknown")
    doc_ref = db.collection("translations").document(user_id).collection(doc_name).document()
    await doc_ref.set({
        "section_id": section_id,
        "source_text": "",
        "translated_text": "",
        "nuance_notes": nuance_notes,
        "image_url": signed_url,
        "image_description": description,
        "target_language": target_language,
        "timestamp": firestore.SERVER_TIMESTAMP,
    })

    return f"Translated image for '{section_id}' has been saved and will appear in the annotation panel."
