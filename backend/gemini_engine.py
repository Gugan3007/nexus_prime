"""
Gemini-Powered Nexus-Prime Analysis Engine
==========================================
Uses Google Gemini 1.5 Pro for intelligent forensic quotation analysis.
Falls back to the rule-based engine if the API call fails.

Developer: Gugan Saravanan
Roll Number: CB.SC.U4CSE23416
"""

import json
import os
import traceback
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

import google.generativeai as genai

# Configure Gemini
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

# ─── The Nexus-Prime System Prompt ──────────────────────────────────────
NEXUS_PRIME_SYSTEM_PROMPT = """
You are "Nexus-Prime," a Principal Procurement Intelligence Agent operating within a high-stakes, Fortune 500 supply chain ecosystem. Your primary objective is to ingest unstructured vendor quotations, extract commercial data with 100% accuracy, normalize disparate terms, and execute a Multi-Criteria Decision Analysis (MCDA).

You do not merely read text; you act as a forensic accountant, a legal risk assessor, and a strategic negotiator. Your final output must be highly structured, deterministic, and immediately ingestible by a downstream dashboard.

### EXECUTION PIPELINE (STRICT CHAIN-OF-THOUGHT)
You must sequentially execute the following seven phases. Do not skip any phase.

#### PHASE 1: DOCUMENT METADATA & INTEGRITY CHECK
- Identify the Vendor Name, Quotation Date, Validity Period, and Quotation ID.
- Flag if the quotation is expired based on today's date (2026-02-21).
- Assess document completeness. If critical elements (like total price) are missing, flag as "INVALID_DOCUMENT".

#### PHASE 2: FORENSIC COMMERCIAL EXTRACTION
- Extract every line item. For each item, capture: Item Description, SKU/Part Number (if available), Quantity, Unit of Measure (UoM), Unit Price, and Line Item Subtotal.
- Identify all applied taxes (VAT, GST, State Tax) and separate them from the base cost.
- Identify shipping, freight, handling, and installation charges.

#### PHASE 3: METRIC NORMALIZATION
- Timeline: Convert all delivery terms into a strict integer representing "Total Calendar Days to Delivery".
- Currency: Extract the base, tax, and total costs exactly as written in the document. DO NOT convert to USD. Preserve the original currency values (e.g. if INR, extract INR value exactly as is).

#### PHASE 4: QUALITY, BRAND, & SENTIMENT ANALYSIS
- Cross-reference the document with the market intelligence feed.
- Calculate a Brand Trust Tier (Tier 1: Enterprise/Global, Tier 2: Mid-Market, Tier 3: Unverified/High-Risk).
- Extract the Average Customer Rating (out of 5.0). If you cannot find real data for this, YOU MUST set it to exactly 0.0. NEVER invent or guess a rating like "3.5".
- Identify any ISO certifications, compliance standards, or premium quality markers.

#### PHASE 5: LEGAL & RISK SCRUBBING
- Scan fine print for hidden liabilities: Variable Pricing clauses, Force Majeure, auto-renewal, non-refundable terms.
- Evaluate Payment Terms. Penalize "100% Upfront" in the risk score.
- Extract the RAW warranty terms EXACTLY as written (e.g., '2 Years', '30 Days', 'None').
- Evaluate Warranty Terms. Classify as "POOR (< 1 year)", "STANDARD (1-2 years)", or "PREMIUM (> 2 years)".

#### PHASE 6: MULTI-CRITERIA SCORING ALGORITHM
Calculate a "Nexus Trust Score" (0.00 to 100.00) using the provided buyer priority weights.
Default weights: Cost (40%), Quality & Brand Trust (30%), Delivery Speed (20%), Risk Profile (10%).

#### PHASE 7: STRATEGIC NEGOTIATION GENERATION
- Analyze the weakest point of the vendor's proposal.
- Draft a precise, professional 2-sentence negotiation strategy for the buyer.

### STRICT ANTI-HALLUCINATION PROTOCOL
- If a data point is not explicitly found in the document or market feed, output "null" or "NOT_SPECIFIED".
- Never guess a price, tax rate, or delivery time.
- Mathematical precision is absolute.

### OUTPUT SCHEMA (STRICT JSON)
Return a single, valid JSON object matching this schema exactly. Do NOT include markdown formatting.

{
  "document_metadata": {
    "vendor_name": "string",
    "quotation_id": "string",
    "date_issued": "YYYY-MM-DD",
    "valid_until": "YYYY-MM-DD",
    "is_expired": boolean,
    "integrity_flags": ["list of strings"]
  },
  "line_items": [
    {
      "description": "string",
      "sku_or_part": "string or null",
      "quantity": number,
      "unit_measure": "string",
      "unit_price_usd": number,
      "subtotal_usd": number
    }
  ],
  "commercial_summary": {
    "total_base_cost_usd": number,
    "total_tax_usd": number,
    "tax_details": {},
    "shipping_and_handling_usd": number,
    "true_total_landed_cost_usd": number,
    "original_currency_code": "string",
    "normalized_delivery_days": integer,
    "delivery_raw": "string",
    "payment_terms": "string"
  },
  "quality_and_intelligence": {
    "brand_tier": "string",
    "customer_rating_out_of_5": number,
    "esg_score_raw": "number or string",
    "esg_score_classification": "string",
    "certifications_detected": ["list of strings"],
    "warranty_raw": "string format or NOT_SPECIFIED",
    "warranty_classification": "string",
    "review_summary": {
      "total": integer,
      "positive": integer,
      "negative": integer,
      "neutral": integer
    }
  },
  "risk_analysis": {
    "overall_risk_level": "LOW | MODERATE | HIGH | CRITICAL",
    "risk_points": number,
    "hidden_clauses_detected": ["list of strings"],
    "risk_justification": "string"
  },
  "mcd_scoring": {
    "nexus_trust_score": number,
    "score_breakdown": {
      "cost_score": number,
      "quality_score": number,
      "speed_score": number,
      "risk_score": number
    }
  },
  "negotiation_copilot": {
    "identified_weakness": "string",
    "suggested_email_script": "string",
    "weakest_dimension": "string"
  }
}
"""


def analyze_with_gemini(
    raw_doc: Dict[str, Any],
    market_intel: Dict[str, Any],
    buyer_priorities: Optional[Dict[str, float]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Send the vendor data to Gemini for AI-powered analysis.
    Returns the structured JSON analysis or None if the call fails.
    """
    if not API_KEY:
        print("[Gemini] No API key configured, skipping AI analysis")
        return None

    try:
        model = genai.GenerativeModel('gemini-2.5-pro')

        # Build the user prompt with all three data streams
        priorities_str = json.dumps(buyer_priorities) if buyer_priorities else json.dumps({
            "cost": 0.40, "quality": 0.30, "speed": 0.20, "risk": 0.10
        })

        user_prompt = f"""
Analyze the following vendor quotation using the Nexus-Prime 7-phase pipeline.

[RAW_DOCUMENT_OCR]:
Vendor Name: {raw_doc.get('vendor_name', 'NOT_SPECIFIED')}
Quotation ID: {raw_doc.get('quotation_id', 'NOT_SPECIFIED')}
Date Issued: {raw_doc.get('date_issued', 'NOT_SPECIFIED')}
Valid Until: {raw_doc.get('valid_until', 'NOT_SPECIFIED')}
Currency: {raw_doc.get('currency', 'USD')}
Delivery Terms: {raw_doc.get('delivery_terms', 'NOT_SPECIFIED')}
Payment Terms: {raw_doc.get('payment_terms', 'NOT_SPECIFIED')}
Warranty: {raw_doc.get('warranty', 'NOT_SPECIFIED')}

Line Items:
{json.dumps(raw_doc.get('line_items', []), indent=2)}

Taxes: {json.dumps(raw_doc.get('taxes', {}))}
Shipping Cost: {raw_doc.get('shipping_cost', 0)}
Handling Cost: {raw_doc.get('handling_cost', 0)}
Installation Cost: {raw_doc.get('installation_cost', 0)}

Document Text:
{raw_doc.get('raw_text', '')}

Fine Print:
{raw_doc.get('fine_print', '')}

Certifications Listed: {json.dumps(raw_doc.get('certifications', []))}

[MARKET_INTELLIGENCE_FEED]:
{json.dumps(market_intel, indent=2)}

[BUYER_PRIORITIES]:
{priorities_str}
"""

        contents = [NEXUS_PRIME_SYSTEM_PROMPT, user_prompt]
        if "image_data" in raw_doc:
            contents.append({
                "mime_type": raw_doc["image_data"]["mime_type"],
                "data": raw_doc["image_data"]["data"]
            })

        response = model.generate_content(
            contents,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.1,
            }
        )

        result = json.loads(response.text)
        result["_analysis_source"] = "gemini-1.5-pro"
        return result

    except Exception as e:
        print(f"[Gemini] Analysis failed: {e}")
        traceback.print_exc()
        return None


def analyze_vendor_with_gemini(
    raw_doc: Dict[str, Any],
    market_intel: Dict[str, Any],
    buyer_priorities: Optional[Dict[str, float]] = None,
    all_costs: Optional[List[float]] = None,
    all_days: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """
    Primary analysis function: tries Gemini first, falls back to rule-based engine.
    """
    # Try Gemini-powered analysis
    gemini_result = analyze_with_gemini(raw_doc, market_intel, buyer_priorities)

    if gemini_result:
        # Ensure all required fields exist with defaults
        gemini_result.setdefault("document_metadata", {})
        gemini_result["document_metadata"].setdefault("vendor_name", raw_doc.get("vendor_name", "NOT_SPECIFIED"))
        gemini_result["document_metadata"].setdefault("quotation_id", raw_doc.get("quotation_id", "NOT_SPECIFIED"))
        gemini_result["document_metadata"].setdefault("integrity_flags", [])

        gemini_result.setdefault("line_items", [])

        gemini_result.setdefault("commercial_summary", {})
        gemini_result["commercial_summary"].setdefault("total_base_cost_usd", 0)
        gemini_result["commercial_summary"].setdefault("total_tax_usd", 0)
        gemini_result["commercial_summary"].setdefault("tax_details", {})
        gemini_result["commercial_summary"].setdefault("shipping_and_handling_usd", 0)
        gemini_result["commercial_summary"].setdefault("true_total_landed_cost_usd", 0)
        gemini_result["commercial_summary"].setdefault("original_currency_code", "USD")
        gemini_result["commercial_summary"].setdefault("normalized_delivery_days", 999)
        gemini_result["commercial_summary"].setdefault("delivery_raw", raw_doc.get("delivery_terms", "NOT_SPECIFIED"))
        gemini_result["commercial_summary"].setdefault("payment_terms", raw_doc.get("payment_terms", "NOT_SPECIFIED"))

        gemini_result.setdefault("quality_and_intelligence", {})
        gemini_result["quality_and_intelligence"].setdefault("brand_tier", "Tier 2: Mid-Market")
        gemini_result["quality_and_intelligence"].setdefault("customer_rating_out_of_5", 0)
        gemini_result["quality_and_intelligence"].setdefault("esg_score_raw", "NOT_SPECIFIED")
        gemini_result["quality_and_intelligence"].setdefault("esg_score_classification", "NOT_SPECIFIED")
        gemini_result["quality_and_intelligence"].setdefault("certifications_detected", [])
        gemini_result["quality_and_intelligence"].setdefault("warranty_raw", raw_doc.get("warranty", "NOT_SPECIFIED"))
        gemini_result["quality_and_intelligence"].setdefault("warranty_classification", "NOT_SPECIFIED")
        gemini_result["quality_and_intelligence"].setdefault("review_summary", {"total": 0, "positive": 0, "negative": 0, "neutral": 0})

        gemini_result.setdefault("risk_analysis", {})
        gemini_result["risk_analysis"].setdefault("overall_risk_level", "MODERATE")
        gemini_result["risk_analysis"].setdefault("risk_points", 0)
        gemini_result["risk_analysis"].setdefault("hidden_clauses_detected", ["None detected"])
        gemini_result["risk_analysis"].setdefault("risk_justification", "")

        gemini_result.setdefault("mcd_scoring", {})
        gemini_result["mcd_scoring"].setdefault("nexus_trust_score", 50.0)
        gemini_result["mcd_scoring"].setdefault("score_breakdown", {
            "cost_score": 50.0, "quality_score": 50.0, "speed_score": 50.0, "risk_score": 50.0
        })

        gemini_result.setdefault("negotiation_copilot", {})
        gemini_result["negotiation_copilot"].setdefault("identified_weakness", "")
        gemini_result["negotiation_copilot"].setdefault("suggested_email_script", "")
        gemini_result["negotiation_copilot"].setdefault("weakest_dimension", "cost")

        print(f"[Gemini] ✅ AI analysis complete for: {raw_doc.get('vendor_name', 'Unknown')}")
        return gemini_result

    # Fallback to rule-based engine
    print(f"[Gemini] ⚠️ Falling back to rule-based engine for: {raw_doc.get('vendor_name', 'Unknown')}")
    from nexus_engine import analyze_vendor
    return analyze_vendor(raw_doc, market_intel, buyer_priorities, all_costs, all_days)
