from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

import tempfile
import os

from app.services.analyzer import stream_analysis
from app.services.pdf_reader import extract_text_from_pdf


router = APIRouter()
MAX_INPUT_CHARACTERS = 12_000
STREAM_HEADERS = {
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
}


class AnalysisRequest(BaseModel):
    text: str


@router.post("/analyze")
def analyze(request: AnalysisRequest):

    text = request.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Information cannot be empty."
        )

    if len(text) > MAX_INPUT_CHARACTERS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Input is too large for fast analysis. Please keep the text "
                f"below {MAX_INPUT_CHARACTERS:,} characters."
            )
        )

    return StreamingResponse(
        stream_analysis(text),
        media_type="text/plain; charset=utf-8",
        headers=STREAM_HEADERS,
    )


@router.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a PDF file."
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    temp_path = None

    try:
        contents = await file.read()

        # 15 MB maximum PDF size
        if len(contents) > 15 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="PDF is too large. Maximum allowed size is 15 MB."
            )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".pdf"
        ) as temp_file:

            temp_file.write(contents)
            temp_path = temp_file.name

        extracted_text = await run_in_threadpool(
            extract_text_from_pdf,
            temp_path,
            MAX_INPUT_CHARACTERS,
        )

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract readable text from this PDF."
            )

        return StreamingResponse(
            stream_analysis(
                "Use this PDF content as the source. Do not invent facts.\n\n"
                f"PDF CONTENT:\n{extracted_text}"
            ),
            media_type="text/plain; charset=utf-8",
            headers={
                **STREAM_HEADERS,
                "X-Source-Filename": file.filename,
            }
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF processing failed: {str(e)}"
        )

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
