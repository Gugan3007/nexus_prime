"""
Nexus-Prime: Smart Quotation Intelligence System
FastAPI Backend Server

Developer: Gugan Saravanan
Roll Number: CB.SC.U4CSE23416
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel

from nexus_engine import analyze_vendor, compare_vendors, phase6_scoring
from gemini_engine import analyze_vendor_with_gemini
from document_parser import extract_text

app = FastAPI(
    title="Nexus-Prime API",
    description="AI-Powered Smart Quotation Intelligence System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory store ────────────────────────────────────────────────────
analysis_store: Dict[str, dict] = {}
audit_log: List[dict] = []

SAMPLE_DATA_PATH = os.path.join(os.path.dirname(__file__), "sample_data", "vendors.json")


def _log_audit(action: str, details: str):
    audit_log.append({
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now().isoformat(),
        "action": action,
        "details": details,
    })


# ─── Models ─────────────────────────────────────────────────────────────
class BuyerPriorities(BaseModel):
    cost: float = 0.40
    quality: float = 0.30
    speed: float = 0.20
    risk: float = 0.10


class ManualQuotation(BaseModel):
    vendor_name: str
    quotation_id: str = ""
    date_issued: str = ""
    valid_until: str = ""
    currency: str = "USD"
    delivery_terms: str = ""
    payment_terms: str = ""
    warranty: str = ""
    raw_text: str = ""
    fine_print: str = ""
    certifications: List[str] = []
    line_items: List[dict] = []
    taxes: dict = {}
    shipping_cost: float = 0
    handling_cost: float = 0
    installation_cost: float = 0


class MarketIntelligence(BaseModel):
    brand_tier: str = "Mid-Market"
    customer_rating: float = 3.0
    esg_score: float = 50
    market_sentiment: str = ""
    reviews: List[dict] = []


class FullVendorInput(BaseModel):
    raw_document: ManualQuotation
    market_intelligence: MarketIntelligence
    buyer_priorities: Optional[BuyerPriorities] = None


# ─── Health ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status": "online",
        "system": "Nexus-Prime v1.0",
        "engine": "Gemini 1.5 Pro + Rule-Based Fallback",
        "developer": "Gugan Saravanan (CB.SC.U4CSE23416)",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/api/health")
def health():
    has_gemini = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "engine_mode": "gemini-ai" if has_gemini else "rule-based",
        "analyses_stored": len(analysis_store),
        "audit_entries": len(audit_log),
    }


# ─── Sample Data ────────────────────────────────────────────────────────
@app.get("/api/sample-vendors")
def get_sample_vendors():
    """Return the 3 pre-built sample vendors."""
    try:
        with open(SAMPLE_DATA_PATH, "r") as f:
            data = json.load(f)
        return data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Sample data not found")


@app.post("/api/analyze-samples")
def analyze_samples(priorities: Optional[BuyerPriorities] = None):
    """Analyze all 3 sample vendors and return full comparison."""
    try:
        with open(SAMPLE_DATA_PATH, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Sample data not found")

    vendors = data.get("vendors", [])
    buyer_p = priorities.dict() if priorities else None

    # Analyze each vendor using Gemini AI (with rule-based fallback)
    final_results = []
    for v in vendors:
        result = analyze_vendor_with_gemini(
            raw_doc=v["raw_document"],
            market_intel=v["market_intelligence"],
            buyer_priorities=buyer_p,
        )
        vid = v.get("id", str(uuid.uuid4()))
        analysis_store[vid] = result
        final_results.append(result)

    comparison = compare_vendors(final_results)
    _log_audit("SAMPLE_ANALYSIS", f"Analyzed {len(vendors)} sample vendors")

    return {
        "vendor_analyses": final_results,
        "comparison": comparison,
        "analysis_timestamp": datetime.now().isoformat(),
    }


# ─── Single Vendor Analysis ────────────────────────────────────────────
@app.post("/api/analyze")
def analyze_single(payload: FullVendorInput):
    """Analyze a single vendor with provided data."""
    raw_doc = payload.raw_document.dict()
    market_intel = payload.market_intelligence.dict()
    buyer_p = payload.buyer_priorities.dict() if payload.buyer_priorities else None

    result = analyze_vendor_with_gemini(raw_doc, market_intel, buyer_p)

    vid = str(uuid.uuid4())
    analysis_store[vid] = result
    _log_audit("SINGLE_ANALYSIS", f"Analyzed vendor: {raw_doc.get('vendor_name', 'Unknown')}")

    return {"vendor_id": vid, "analysis": result}


# ─── File Upload ────────────────────────────────────────────────────────
@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...),
    market_intelligence: str = Form("{}"),
    buyer_priorities: str = Form("{}"),
):
    """Upload a PDF/DOCX and extract text for analysis."""
    contents = await file.read()
    raw_text = extract_text(contents, file.filename)

    if raw_text is None:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}")

    try:
        mi = json.loads(market_intelligence)
    except json.JSONDecodeError:
        mi = {}

    try:
        bp = json.loads(buyer_priorities)
    except json.JSONDecodeError:
        bp = None

    # Build a basic raw_doc from extracted text
    raw_doc = {
        "vendor_name": file.filename.split(".")[0],
        "quotation_id": f"UPLOAD-{uuid.uuid4().hex[:8].upper()}",
        "date_issued": datetime.now().strftime("%Y-%m-%d"),
        "valid_until": "NOT_SPECIFIED",
        "currency": "USD",
        "delivery_terms": "NOT_SPECIFIED",
        "payment_terms": "NOT_SPECIFIED",
        "warranty": "NOT_SPECIFIED",
        "raw_text": raw_text,
        "fine_print": "",
        "certifications": [],
        "line_items": [],
        "taxes": {},
        "shipping_cost": 0,
        "handling_cost": 0,
        "installation_cost": 0,
    }

    result = await run_in_threadpool(analyze_vendor_with_gemini, raw_doc, mi, bp)
    vid = str(uuid.uuid4())
    analysis_store[vid] = result
    _log_audit("FILE_UPLOAD", f"Uploaded and analyzed: {file.filename}")

    return {
        "vendor_id": vid,
        "filename": file.filename,
        "extracted_text_preview": raw_text[:500],
        "analysis": result,
    }


# ─── Comparison ─────────────────────────────────────────────────────────
@app.post("/api/compare")
def compare(vendor_ids: List[str] = []):
    """Compare previously analyzed vendors by their IDs."""
    if not vendor_ids:
        # If empty, return the most recent ones (up to 4) so we don't mix old uploads
        analyses = list(analysis_store.values())[-5:]
    else:
        analyses = [analysis_store[vid] for vid in vendor_ids if vid in analysis_store]

    if len(analyses) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 vendors to compare")

    comparison = compare_vendors(analyses)
    _log_audit("COMPARISON", f"Compared {len(analyses)} vendors")

    return {"comparison": comparison, "vendor_details": analyses}


# ─── Stored Results ─────────────────────────────────────────────────────
@app.get("/api/analyses")
def get_all_analyses():
    """Retrieve all stored analyses."""
    return {"analyses": analysis_store, "count": len(analysis_store)}


@app.get("/api/analysis/{vendor_id}")
def get_analysis(vendor_id: str):
    """Get a specific vendor analysis."""
    if vendor_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_store[vendor_id]


# ─── Audit Log ──────────────────────────────────────────────────────────
@app.get("/api/audit")
def get_audit_log():
    """Retrieve the full audit trail."""
    return {"audit_log": list(reversed(audit_log)), "total_entries": len(audit_log)}


@app.delete("/api/clear")
def clear_store():
    """Clear all stored analyses and audit log."""
    analysis_store.clear()
    audit_log.clear()
    return {"status": "cleared"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
