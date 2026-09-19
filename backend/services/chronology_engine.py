"""
MineIntel Phase 4: Adaptive Chronology Engine

Extracts temporal signals across structured evidence content, metadata, and provenance.
Dynamically calculates optimal granularity (Day, Week, Month, Quarter, Year) based on data density.
"""
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from backend.services.intelligence_models import ChronologyGranularity, TemporalEntity

logger = logging.getLogger("mineintel.chronology")

MONTH_NAMES = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12
}


class ChronologyEngine:
    """Extracts, normalizes, and groups evidence by chronological timeline."""

    @classmethod
    def extract_temporal_signal(cls, item: Dict[str, Any]) -> TemporalEntity:
        """Extracts date/timestamp from content_text, content_json, or metadata."""
        text = str(item.get("content_text", ""))
        prov = item.get("provenance", {}) or {}
        meta = item.get("metadata", {}) or {}
        content_json = item.get("content_json", {}) or {}

        # 1. Check content_json or metadata explicit date fields
        for field in ["date", "timestamp", "period", "reporting_date", "fiscal_year", "quarter"]:
            val = content_json.get(field) or meta.get(field) or prov.get(field)
            if val and isinstance(val, (str, int)):
                parsed = cls._parse_text_date(str(val))
                if parsed.granularity != ChronologyGranularity.UNDATED.value:
                    return parsed

        # 2. Check text regex patterns
        parsed_from_text = cls._parse_text_date(text)
        if parsed_from_text.granularity != ChronologyGranularity.UNDATED.value:
            return parsed_from_text

        # 3. Check filename for date clues (e.g. production_2024_03.csv)
        filename = prov.get("filename", "")
        if filename:
            parsed_fn = cls._parse_text_date(filename)
            if parsed_fn.granularity != ChronologyGranularity.UNDATED.value:
                return parsed_fn

        return TemporalEntity(raw_text="")

    @classmethod
    def _parse_text_date(cls, text: str) -> TemporalEntity:
        if not text:
            return TemporalEntity(raw_text="")

        # Pattern 1: ISO date YYYY-MM-DD
        m = re.search(r"\b(20\d\d)[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b", text)
        if m:
            year, month, day = int(m.group(1)), int(m.group(2)), int(m.group(3))
            q = f"Q{(month - 1) // 3 + 1}"
            return TemporalEntity(
                raw_text=m.group(0),
                normalized_date=f"{year:04d}-{month:02d}-{day:02d}",
                granularity=ChronologyGranularity.DAY.value,
                year=year,
                month=month,
                day=day,
                quarter=q
            )

        # Pattern 2: DD-MM-YYYY or DD/MM/YYYY
        m = re.search(r"\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](20\d\d)\b", text)
        if m:
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
            q = f"Q{(month - 1) // 3 + 1}"
            return TemporalEntity(
                raw_text=m.group(0),
                normalized_date=f"{year:04d}-{month:02d}-{day:02d}",
                granularity=ChronologyGranularity.DAY.value,
                year=year,
                month=month,
                day=day,
                quarter=q
            )

        # Pattern 3: Month name + Day + Year (e.g., 15 March 2024 or March 15, 2024)
        m = re.search(r"\b(0?[1-9]|[12]\d|3[01])?\s*([A-Za-z]+)\s*,?\s*(20\d\d)\b", text)
        if m:
            day_str, month_str, year_str = m.group(1), m.group(2).lower(), m.group(3)
            if month_str in MONTH_NAMES:
                month = MONTH_NAMES[month_str]
                year = int(year_str)
                if day_str:
                    day = int(day_str)
                    return TemporalEntity(
                        raw_text=m.group(0),
                        normalized_date=f"{year:04d}-{month:02d}-{day:02d}",
                        granularity=ChronologyGranularity.DAY.value,
                        year=year,
                        month=month,
                        day=day,
                        quarter=f"Q{(month - 1) // 3 + 1}"
                    )
                else:
                    return TemporalEntity(
                        raw_text=m.group(0),
                        normalized_date=f"{year:04d}-{month:02d}",
                        granularity=ChronologyGranularity.MONTH.value,
                        year=year,
                        month=month,
                        quarter=f"Q{(month - 1) // 3 + 1}"
                    )

        # Pattern 4: Quarter + Fiscal Year (e.g., Q1 FY24, Q3 FY2023-24, Q4 2023)
        m = re.search(r"\b(Q[1-4])\s*(?:FY)?\s*(20\d\d|\d\d)?(?:\s*-\s*(\d\d|\d{4}))?\b", text, re.IGNORECASE)
        if m and m.group(1):
            q = m.group(1).upper()
            year_val = None
            if m.group(2):
                y = int(m.group(2))
                year_val = y if y > 100 else 2000 + y
            return TemporalEntity(
                raw_text=m.group(0),
                granularity=ChronologyGranularity.QUARTER.value,
                quarter=q,
                year=year_val,
                fiscal_year=f"FY{year_val}" if year_val else None
            )

        # Pattern 5: Month + Year (e.g., 2024-03, 03/2024)
        m = re.search(r"\b(20\d\d)[-/](0[1-9]|1[0-2])\b", text)
        if m:
            year, month = int(m.group(1)), int(m.group(2))
            return TemporalEntity(
                raw_text=m.group(0),
                normalized_date=f"{year:04d}-{month:02d}",
                granularity=ChronologyGranularity.MONTH.value,
                year=year,
                month=month,
                quarter=f"Q{(month - 1) // 3 + 1}"
            )

        # Pattern 6: Year-only (e.g., FY2024, 2024)
        m = re.search(r"\b(?:FY\s*)?(20[12]\d)\b", text)
        if m:
            year = int(m.group(1))
            return TemporalEntity(
                raw_text=m.group(0),
                normalized_date=f"{year:04d}",
                granularity=ChronologyGranularity.YEAR.value,
                year=year
            )

        return TemporalEntity(raw_text="")

    @classmethod
    def build_adaptive_timeline(cls, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Organizes evidence into chronological timeline buckets based on detected date density.
        Selects granularity adaptively.
        """
        dated_items: List[Tuple[Dict[str, Any], TemporalEntity]] = []
        undated_ids: List[str] = []

        day_count = 0
        month_count = 0
        quarter_count = 0
        year_count = 0

        for it in items:
            t = cls.extract_temporal_signal(it)
            if t.granularity != ChronologyGranularity.UNDATED.value:
                dated_items.append((it, t))
                if t.granularity == ChronologyGranularity.DAY.value:
                    day_count += 1
                elif t.granularity == ChronologyGranularity.MONTH.value:
                    month_count += 1
                elif t.granularity == ChronologyGranularity.QUARTER.value:
                    quarter_count += 1
                elif t.granularity == ChronologyGranularity.YEAR.value:
                    year_count += 1
            else:
                undated_ids.append(it.get("evidence_id", ""))

        if not dated_items:
            return [{
                "period": "Undated",
                "granularity": ChronologyGranularity.UNDATED.value,
                "evidence_count": len(undated_ids),
                "evidence_ids": undated_ids
            }]

        # Determine dominant granularity
        if day_count >= len(dated_items) * 0.4:
            chosen_granularity = ChronologyGranularity.DAY.value
        elif month_count + day_count >= len(dated_items) * 0.5:
            chosen_granularity = ChronologyGranularity.MONTH.value
        elif quarter_count >= len(dated_items) * 0.3:
            chosen_granularity = ChronologyGranularity.QUARTER.value
        else:
            chosen_granularity = ChronologyGranularity.YEAR.value

        buckets: Dict[str, List[str]] = {}

        for it, t in dated_items:
            ev_id = it.get("evidence_id", "")
            key = "Unknown"

            if chosen_granularity == ChronologyGranularity.DAY.value:
                key = t.normalized_date or (f"{t.year:04d}-{t.month:02d}" if t.year and t.month else (str(t.year) if t.year else "Unknown"))
            elif chosen_granularity == ChronologyGranularity.MONTH.value:
                if t.year and t.month:
                    key = f"{t.year:04d}-{t.month:02d}"
                elif t.year:
                    key = str(t.year)
            elif chosen_granularity == ChronologyGranularity.QUARTER.value:
                if t.quarter and t.year:
                    key = f"{t.year} {t.quarter}"
                elif t.quarter:
                    key = t.quarter
                elif t.year:
                    key = str(t.year)
            else:  # YEAR
                key = str(t.year) if t.year else "Unknown"

            buckets.setdefault(key, []).append(ev_id)

        # Sort buckets chronologically
        timeline = []
        for period in sorted(buckets.keys()):
            timeline.append({
                "period": period,
                "granularity": chosen_granularity,
                "evidence_count": len(buckets[period]),
                "evidence_ids": buckets[period]
            })

        if undated_ids:
            timeline.append({
                "period": "Undated",
                "granularity": ChronologyGranularity.UNDATED.value,
                "evidence_count": len(undated_ids),
                "evidence_ids": undated_ids
            })

        return timeline


chronology_engine = ChronologyEngine()
