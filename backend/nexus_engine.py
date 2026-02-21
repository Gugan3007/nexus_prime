"""
Nexus-Prime: 7-Phase Forensic Quotation Analysis Engine
========================================================
Executes a strict chain-of-thought pipeline to analyze
vendor quotations with 100% deterministic output.
"""

import re
import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


# ─── CURRENCY CONVERSION RATES ─────────────────────────────────────────
CURRENCY_RATES = {
    "USD": 1.0,
    "EUR": 1.08,
    "GBP": 1.26,
    "INR": 0.012,
}


def _to_usd(amount: float, currency: str) -> float:
    """Convert amount to USD."""
    rate = CURRENCY_RATES.get(currency.upper(), 1.0)
    return round(amount * rate, 2)


def _delivery_to_days(delivery_str: str) -> int:
    """Convert delivery terms to calendar days."""
    if not delivery_str or delivery_str == "NOT_SPECIFIED":
        return 999
    s = delivery_str.lower().strip()
    # "X days"
    m = re.search(r"(\d+)\s*(?:calendar\s*)?days?", s)
    if m:
        return int(m.group(1))
    # "X weeks"
    m = re.search(r"(\d+)\s*(?:business\s*)?weeks?", s)
    if m:
        return int(m.group(1)) * 7
    # "X months" / "X business months"
    m = re.search(r"(\d+)\s*(?:business\s*)?months?", s)
    if m:
        return int(m.group(1)) * 30
    # Try bare number
    m = re.search(r"(\d+)", s)
    if m:
        return int(m.group(1))
    return 999


# ═══════════════════════════════════════════════════════════════════════
# PHASE 1: DOCUMENT METADATA & INTEGRITY CHECK
# ═══════════════════════════════════════════════════════════════════════
def phase1_metadata(raw_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Extract document metadata and check integrity."""
    vendor_name = raw_doc.get("vendor_name", "NOT_SPECIFIED")
    quotation_id = raw_doc.get("quotation_id", "NOT_SPECIFIED")
    date_issued = raw_doc.get("date_issued", "NOT_SPECIFIED")
    valid_until = raw_doc.get("valid_until", "NOT_SPECIFIED")

    is_expired = False
    if valid_until and valid_until != "NOT_SPECIFIED":
        try:
            exp_date = datetime.strptime(valid_until, "%Y-%m-%d")
            is_expired = datetime.now() > exp_date
        except ValueError:
            pass

    # Integrity flags
    flags = []
    if not raw_doc.get("line_items"):
        flags.append("MISSING_LINE_ITEMS")
    if not raw_doc.get("total_price") and not raw_doc.get("line_items"):
        flags.append("INVALID_DOCUMENT")
    if is_expired:
        flags.append("QUOTATION_EXPIRED")

    return {
        "vendor_name": vendor_name,
        "quotation_id": quotation_id,
        "date_issued": date_issued,
        "valid_until": valid_until,
        "is_expired": is_expired,
        "integrity_flags": flags,
    }


# ═══════════════════════════════════════════════════════════════════════
# PHASE 2: FORENSIC COMMERCIAL EXTRACTION
# ═══════════════════════════════════════════════════════════════════════
def phase2_extraction(raw_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Extract line items, taxes, shipping from the document."""
    currency = raw_doc.get("currency", "USD")
    line_items_raw = raw_doc.get("line_items", [])

    line_items = []
    total_base = 0.0

    for item in line_items_raw:
        unit_price = _to_usd(item.get("unit_price", 0), currency)
        qty = item.get("quantity", 0)
        subtotal = round(unit_price * qty, 2)
        total_base += subtotal

        line_items.append({
            "description": item.get("description", "NOT_SPECIFIED"),
            "sku_or_part": item.get("sku", item.get("part_number", None)),
            "quantity": qty,
            "unit_measure": item.get("unit_measure", item.get("uom", "Units")),
            "unit_price_usd": unit_price,
            "subtotal_usd": subtotal,
        })

    # Tax extraction
    taxes = raw_doc.get("taxes", {})
    total_tax = 0.0
    tax_details = {}
    for tax_name, tax_val in taxes.items():
        if isinstance(tax_val, (int, float)):
            # Could be a rate or absolute
            if tax_val < 1:
                # It's a rate
                tax_amount = round(total_base * tax_val, 2)
            else:
                tax_amount = _to_usd(tax_val, currency)
            total_tax += tax_amount
            tax_details[tax_name] = tax_amount

    # Shipping / freight
    shipping = _to_usd(raw_doc.get("shipping_cost", 0), currency)
    handling = _to_usd(raw_doc.get("handling_cost", 0), currency)
    installation = _to_usd(raw_doc.get("installation_cost", 0), currency)
    total_shipping = round(shipping + handling + installation, 2)

    return {
        "line_items": line_items,
        "total_base_cost_usd": round(total_base, 2),
        "total_tax_usd": round(total_tax, 2),
        "tax_details": tax_details,
        "shipping_and_handling_usd": total_shipping,
        "true_total_landed_cost_usd": round(total_base + total_tax + total_shipping, 2),
    }


# ═══════════════════════════════════════════════════════════════════════
# PHASE 3: METRIC NORMALIZATION
# ═══════════════════════════════════════════════════════════════════════
def phase3_normalization(raw_doc: Dict[str, Any], commercial: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize delivery and payment terms."""
    delivery_raw = raw_doc.get("delivery_terms", "NOT_SPECIFIED")
    delivery_days = _delivery_to_days(delivery_raw)
    payment_terms = raw_doc.get("payment_terms", "NOT_SPECIFIED")

    return {
        "normalized_delivery_days": delivery_days,
        "delivery_raw": delivery_raw,
        "payment_terms": payment_terms,
    }


# ═══════════════════════════════════════════════════════════════════════
# PHASE 4: QUALITY, BRAND & SENTIMENT ANALYSIS
# ═══════════════════════════════════════════════════════════════════════
def phase4_quality(raw_doc: Dict[str, Any], market_intel: Dict[str, Any]) -> Dict[str, Any]:
    """Cross-reference doc with market intelligence."""

    # Brand tier determination
    brand_tier_map = {
        "enterprise": "Tier 1: Enterprise/Global",
        "global": "Tier 1: Enterprise/Global",
        "tier1": "Tier 1: Enterprise/Global",
        "mid-market": "Tier 2: Mid-Market",
        "midmarket": "Tier 2: Mid-Market",
        "tier2": "Tier 2: Mid-Market",
        "startup": "Tier 3: Unverified/High-Risk",
        "unverified": "Tier 3: Unverified/High-Risk",
        "tier3": "Tier 3: Unverified/High-Risk",
    }

    market_tier = str(market_intel.get("brand_tier", "")).lower().replace(" ", "")
    brand_tier = brand_tier_map.get(market_tier, "Tier 2: Mid-Market")

    customer_rating = market_intel.get("customer_rating", 0.0)
    esg_score = market_intel.get("esg_score", "NOT_SPECIFIED")
    if isinstance(esg_score, (int, float)):
        if esg_score >= 80:
            esg_class = "EXCELLENT"
        elif esg_score >= 60:
            esg_class = "GOOD"
        elif esg_score >= 40:
            esg_class = "MODERATE"
        else:
            esg_class = "POOR"
    else:
        esg_class = str(esg_score)

    # Certifications from document
    certifications = raw_doc.get("certifications", [])
    if not certifications:
        # Try to detect from text
        text = raw_doc.get("raw_text", "")
        cert_patterns = [
            r"ISO\s*\d{4,5}(?::\d{4})?",
            r"CE\s+[Mm]ark",
            r"RoHS",
            r"UL\s+[Ll]isted",
            r"FDA\s+[Aa]pproved",
            r"Six\s+Sigma",
        ]
        for pat in cert_patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            certifications.extend(matches)

    # Warranty
    warranty_raw = raw_doc.get("warranty", "NOT_SPECIFIED")
    if warranty_raw and warranty_raw != "NOT_SPECIFIED":
        years_match = re.search(r"(\d+)\s*years?", str(warranty_raw), re.IGNORECASE)
        months_match = re.search(r"(\d+)\s*months?", str(warranty_raw), re.IGNORECASE)
        if years_match:
            yrs = int(years_match.group(1))
            if yrs > 2:
                warranty_class = "PREMIUM (> 2 years)"
            elif yrs >= 1:
                warranty_class = "STANDARD (1-2 years)"
            else:
                warranty_class = "POOR (< 1 year)"
        elif months_match:
            mos = int(months_match.group(1))
            if mos > 24:
                warranty_class = "PREMIUM (> 2 years)"
            elif mos >= 12:
                warranty_class = "STANDARD (1-2 years)"
            else:
                warranty_class = "POOR (< 1 year)"
        else:
            warranty_class = "NOT_SPECIFIED"
    else:
        warranty_class = "NOT_SPECIFIED"

    # Market reviews
    reviews = market_intel.get("reviews", [])
    positive_count = sum(1 for r in reviews if r.get("sentiment", "").lower() == "positive")
    negative_count = sum(1 for r in reviews if r.get("sentiment", "").lower() == "negative")
    review_summary = {
        "total": len(reviews),
        "positive": positive_count,
        "negative": negative_count,
        "neutral": len(reviews) - positive_count - negative_count,
    }

    return {
        "brand_tier": brand_tier,
        "customer_rating_out_of_5": round(customer_rating, 1),
        "esg_score_raw": market_intel.get("esg_score", "NOT_SPECIFIED"),
        "esg_score_classification": esg_class,
        "certifications_detected": certifications,
        "warranty_classification": warranty_class,
        "review_summary": review_summary,
    }


# ═══════════════════════════════════════════════════════════════════════
# PHASE 5: LEGAL & RISK SCRUBBING
# ═══════════════════════════════════════════════════════════════════════
def phase5_risk(raw_doc: Dict[str, Any], quality: Dict[str, Any]) -> Dict[str, Any]:
    """Scan for hidden clauses and risk factors."""
    hidden_clauses = []
    risk_points = 0

    text = raw_doc.get("raw_text", "") + " " + raw_doc.get("fine_print", "")
    text_lower = text.lower()

    # Variable pricing
    var_patterns = [
        "prices subject to",
        "market fluctuation",
        "price adjustment",
        "subject to change",
        "prices may vary",
    ]
    for pat in var_patterns:
        if pat in text_lower:
            hidden_clauses.append(f"Variable Pricing: detected '{pat}'")
            risk_points += 15
            break

    # Force majeure / liability caps
    if "force majeure" in text_lower:
        hidden_clauses.append("Force Majeure clause detected")
        risk_points += 10
    if "limitation of liability" in text_lower or "liability cap" in text_lower:
        hidden_clauses.append("Liability Cap clause detected")
        risk_points += 10

    # Auto-renewal
    if "auto-renew" in text_lower or "automatic renewal" in text_lower:
        hidden_clauses.append("Auto-Renewal clause detected")
        risk_points += 8

    # Non-refundable
    if "non-refundable" in text_lower or "no refund" in text_lower:
        hidden_clauses.append("Non-Refundable terms detected")
        risk_points += 12

    # Payment terms risk
    payment = raw_doc.get("payment_terms", "").lower()
    if "100% upfront" in payment or "advance" in payment or "100% advance" in payment:
        risk_points += 20
        hidden_clauses.append("High-Risk Payment: 100% upfront required")
    elif "50% upfront" in payment or "50% advance" in payment:
        risk_points += 10
        hidden_clauses.append("Moderate-Risk Payment: 50% upfront required")

    # Warranty risk
    warranty = quality.get("warranty_classification", "")
    if warranty == "POOR (< 1 year)":
        risk_points += 10
    elif warranty == "NOT_SPECIFIED":
        risk_points += 15

    # Brand tier risk
    tier = quality.get("brand_tier", "")
    if "Tier 3" in tier:
        risk_points += 15
    elif "Tier 2" in tier:
        risk_points += 5

    # Rating risk
    rating = quality.get("customer_rating_out_of_5", 0)
    if rating < 3.0:
        risk_points += 10
    elif rating < 3.5:
        risk_points += 5

    # Classify
    if risk_points >= 50:
        risk_level = "CRITICAL"
    elif risk_points >= 30:
        risk_level = "HIGH"
    elif risk_points >= 15:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    justifications = []
    if risk_points >= 30:
        justifications.append(f"Accumulated {risk_points} risk points from contractual analysis.")
    if hidden_clauses:
        justifications.append(f"Detected {len(hidden_clauses)} concerning clause(s).")
    if not justifications:
        justifications.append("No significant risk factors detected. Strong contractual terms.")

    return {
        "overall_risk_level": risk_level,
        "risk_points": risk_points,
        "hidden_clauses_detected": hidden_clauses if hidden_clauses else ["None detected"],
        "risk_justification": " ".join(justifications),
    }


# ═══════════════════════════════════════════════════════════════════════
# PHASE 6: MULTI-CRITERIA SCORING ALGORITHM
# ═══════════════════════════════════════════════════════════════════════
def phase6_scoring(
    commercial: Dict[str, Any],
    normalization: Dict[str, Any],
    quality: Dict[str, Any],
    risk: Dict[str, Any],
    buyer_priorities: Optional[Dict[str, float]] = None,
    all_costs: Optional[List[float]] = None,
    all_days: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """Calculate Nexus Trust Score using MCDA."""

    # Default weights
    weights = buyer_priorities or {
        "cost": 0.40,
        "quality": 0.30,
        "speed": 0.20,
        "risk": 0.10,
    }

    # Normalize weights
    total_w = sum(weights.values())
    weights = {k: v / total_w for k, v in weights.items()}

    # ── Cost Score (0-100, lower cost = higher score) ──
    cost = commercial.get("true_total_landed_cost_usd", 0)
    if all_costs and len(all_costs) > 1:
        min_c, max_c = min(all_costs), max(all_costs)
        if max_c > min_c:
            cost_score = round(100 * (1 - (cost - min_c) / (max_c - min_c)), 2)
        else:
            cost_score = 100.0
    else:
        # Solo evaluation: base on absolute
        if cost > 0:
            cost_score = max(0, min(100, round(100 - (cost / 1000), 2)))
        else:
            cost_score = 0.0

    # ── Quality Score (0-100) ──
    quality_score = 0.0
    # Brand tier
    tier = quality.get("brand_tier", "")
    if "Tier 1" in tier:
        quality_score += 40
    elif "Tier 2" in tier:
        quality_score += 25
    else:
        quality_score += 10
    # Customer rating (out of 5 → scaled to 30)
    rating = quality.get("customer_rating_out_of_5", 0)
    quality_score += round((rating / 5.0) * 30, 2)
    # ESG
    esg = quality.get("esg_score_classification", "")
    esg_map = {"EXCELLENT": 15, "GOOD": 10, "MODERATE": 5, "POOR": 0}
    quality_score += esg_map.get(esg, 5)
    # Certifications
    certs = quality.get("certifications_detected", [])
    quality_score += min(len(certs) * 3, 15)
    quality_score = min(quality_score, 100)

    # ── Speed Score (0-100, fewer days = higher) ──
    days = normalization.get("normalized_delivery_days", 999)
    if all_days and len(all_days) > 1:
        min_d, max_d = min(all_days), max(all_days)
        if max_d > min_d:
            speed_score = round(100 * (1 - (days - min_d) / (max_d - min_d)), 2)
        else:
            speed_score = 100.0
    else:
        if days <= 7:
            speed_score = 100.0
        elif days <= 14:
            speed_score = 85.0
        elif days <= 30:
            speed_score = 65.0
        elif days <= 60:
            speed_score = 40.0
        else:
            speed_score = 10.0

    # ── Risk Score (0-100, lower risk points = higher score) ──
    rp = risk.get("risk_points", 0)
    risk_score = max(0, round(100 - rp * 1.5, 2))

    # ── Weighted aggregate ──
    nexus_score = round(
        cost_score * weights.get("cost", 0.4)
        + quality_score * weights.get("quality", 0.3)
        + speed_score * weights.get("speed", 0.2)
        + risk_score * weights.get("risk", 0.1),
        2
    )

    return {
        "nexus_trust_score": nexus_score,
        "score_breakdown": {
            "cost_score": round(cost_score, 2),
            "quality_score": round(quality_score, 2),
            "speed_score": round(speed_score, 2),
            "risk_score": round(risk_score, 2),
        },
    }


# ═══════════════════════════════════════════════════════════════════════
# PHASE 7: STRATEGIC NEGOTIATION GENERATION
# ═══════════════════════════════════════════════════════════════════════
def phase7_negotiation(
    metadata: Dict, commercial: Dict, normalization: Dict,
    quality: Dict, risk: Dict, scoring: Dict
) -> Dict[str, Any]:
    """Generate a negotiation strategy targeting the vendor's weakest point."""
    breakdown = scoring.get("score_breakdown", {})
    scores = {
        "cost": breakdown.get("cost_score", 50),
        "quality": breakdown.get("quality_score", 50),
        "speed": breakdown.get("speed_score", 50),
        "risk": breakdown.get("risk_score", 50),
    }

    weakest = min(scores, key=scores.get)
    vendor = metadata.get("vendor_name", "Vendor")
    cost_val = commercial.get("true_total_landed_cost_usd", 0)
    days = normalization.get("normalized_delivery_days", "N/A")
    payment = normalization.get("payment_terms", "N/A")

    strategies = {
        "cost": {
            "weakness": f"High total landed cost of ${cost_val:,.2f} reduces competitiveness.",
            "script": (
                f"Dear {vendor} Team, we appreciate your detailed quotation. "
                f"However, the total landed cost of ${cost_val:,.2f} exceeds our benchmark for this category. "
                f"Could you review your unit pricing or offer volume-based discounts to bring this closer to our target? "
                f"We are eager to establish a long-term partnership and can offer multi-year commitment in exchange for competitive pricing."
            ),
        },
        "quality": {
            "weakness": f"Brand trust and quality indicators are below expectations (score: {scores['quality']:.0f}/100).",
            "script": (
                f"Dear {vendor} Team, while your pricing is noted, we require stronger quality assurances. "
                f"Could you provide additional ISO certifications, third-party quality audit reports, or extended warranty terms? "
                f"Our procurement policy mandates Tier 1 quality compliance for all mission-critical components."
            ),
        },
        "speed": {
            "weakness": f"Delivery timeline of {days} days is significantly slower than competitors.",
            "script": (
                f"Dear {vendor} Team, your quotation is commercially interesting; however, the {days}-day delivery timeline "
                f"presents a challenge for our project schedule. Can you offer expedited shipping or staged delivery "
                f"to bring the first batch within 2 weeks? We are willing to discuss a slight premium for faster fulfillment."
            ),
        },
        "risk": {
            "weakness": f"Contractual risk profile is elevated due to unfavorable terms (score: {scores['risk']:.0f}/100).",
            "script": (
                f"Dear {vendor} Team, we are interested in your offering but have concerns regarding the payment and warranty terms. "
                f"Specifically, we would need Net 30 payment terms (instead of {payment}) and a minimum 2-year warranty. "
                f"These adjustments are necessary to align with our corporate procurement guidelines and risk tolerance."
            ),
        },
    }

    return {
        "identified_weakness": strategies[weakest]["weakness"],
        "suggested_email_script": strategies[weakest]["script"],
        "weakest_dimension": weakest,
        "all_dimension_scores": scores,
    }


# ═══════════════════════════════════════════════════════════════════════
# MASTER PIPELINE
# ═══════════════════════════════════════════════════════════════════════
def analyze_vendor(
    raw_doc: Dict[str, Any],
    market_intel: Dict[str, Any],
    buyer_priorities: Optional[Dict[str, float]] = None,
    all_costs: Optional[List[float]] = None,
    all_days: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """Execute the full 7-phase pipeline on a single vendor."""

    # Phase 1
    metadata = phase1_metadata(raw_doc)

    # Phase 2
    commercial = phase2_extraction(raw_doc)

    # Phase 3
    normalization = phase3_normalization(raw_doc, commercial)

    # Phase 4
    quality = phase4_quality(raw_doc, market_intel)

    # Phase 5
    risk = phase5_risk(raw_doc, quality)

    # Phase 6
    scoring = phase6_scoring(
        commercial, normalization, quality, risk,
        buyer_priorities, all_costs, all_days
    )

    # Phase 7
    negotiation = phase7_negotiation(
        metadata, commercial, normalization, quality, risk, scoring
    )

    return {
        "document_metadata": {
            "vendor_name": metadata["vendor_name"],
            "quotation_id": metadata["quotation_id"],
            "date_issued": metadata["date_issued"],
            "valid_until": metadata["valid_until"],
            "is_expired": metadata["is_expired"],
            "integrity_flags": metadata["integrity_flags"],
        },
        "line_items": commercial["line_items"],
        "commercial_summary": {
            "total_base_cost_usd": commercial["total_base_cost_usd"],
            "total_tax_usd": commercial["total_tax_usd"],
            "tax_details": commercial.get("tax_details", {}),
            "shipping_and_handling_usd": commercial["shipping_and_handling_usd"],
            "true_total_landed_cost_usd": commercial["true_total_landed_cost_usd"],
            "normalized_delivery_days": normalization["normalized_delivery_days"],
            "delivery_raw": normalization["delivery_raw"],
            "payment_terms": normalization["payment_terms"],
        },
        "quality_and_intelligence": {
            "brand_tier": quality["brand_tier"],
            "customer_rating_out_of_5": quality["customer_rating_out_of_5"],
            "esg_score_raw": quality["esg_score_raw"],
            "esg_score_classification": quality["esg_score_classification"],
            "certifications_detected": quality["certifications_detected"],
            "warranty_classification": quality["warranty_classification"],
            "review_summary": quality["review_summary"],
        },
        "risk_analysis": {
            "overall_risk_level": risk["overall_risk_level"],
            "risk_points": risk["risk_points"],
            "hidden_clauses_detected": risk["hidden_clauses_detected"],
            "risk_justification": risk["risk_justification"],
        },
        "mcd_scoring": scoring,
        "negotiation_copilot": {
            "identified_weakness": negotiation["identified_weakness"],
            "suggested_email_script": negotiation["suggested_email_script"],
            "weakest_dimension": negotiation["weakest_dimension"],
        },
    }


def compare_vendors(
    vendor_analyses: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Compare multiple vendor analyses and determine winner."""
    if not vendor_analyses:
        return {"error": "No vendor data provided"}

    # Sort by Nexus Trust Score
    ranked = sorted(
        vendor_analyses,
        key=lambda v: v.get("mcd_scoring", {}).get("nexus_trust_score", 0),
        reverse=True,
    )

    winner = ranked[0]
    runner_up = ranked[1] if len(ranked) > 1 else None

    # Build comparison matrix
    comparison = {
        "ranked_vendors": [
            {
                "rank": i + 1,
                "vendor_name": v["document_metadata"]["vendor_name"],
                "nexus_trust_score": v["mcd_scoring"]["nexus_trust_score"],
                "total_landed_cost": v["commercial_summary"]["true_total_landed_cost_usd"],
                "delivery_days": v["commercial_summary"]["normalized_delivery_days"],
                "risk_level": v["risk_analysis"]["overall_risk_level"],
                "brand_tier": v["quality_and_intelligence"]["brand_tier"],
            }
            for i, v in enumerate(ranked)
        ],
        "recommended_vendor": winner["document_metadata"]["vendor_name"],
        "recommendation_justification": _build_justification(winner, runner_up),
        "savings_vs_most_expensive": _calc_savings(ranked),
    }

    return comparison


def _build_justification(winner: Dict, runner_up: Optional[Dict]) -> str:
    w_name = winner["document_metadata"]["vendor_name"]
    w_score = winner["mcd_scoring"]["nexus_trust_score"]
    w_cost = winner["commercial_summary"]["true_total_landed_cost_usd"]
    w_risk = winner["risk_analysis"]["overall_risk_level"]

    j = (
        f"{w_name} is recommended with a Nexus Trust Score of {w_score}/100. "
        f"Total landed cost is ${w_cost:,.2f} with a {w_risk} risk profile."
    )
    if runner_up:
        ru_name = runner_up["document_metadata"]["vendor_name"]
        ru_score = runner_up["mcd_scoring"]["nexus_trust_score"]
        j += f" Runner-up: {ru_name} (Score: {ru_score}/100)."
    return j


def _calc_savings(ranked: List[Dict]) -> float:
    costs = [v["commercial_summary"]["true_total_landed_cost_usd"] for v in ranked]
    if len(costs) < 2:
        return 0.0
    return round(max(costs) - min(costs), 2)
