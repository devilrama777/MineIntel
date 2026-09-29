"""
MineIntel Baseline Metrics Framework
Tracks and quantifies human manual baselines vs AI generation performance:
- Time reduction percentage
- Information extraction accuracy
- Structural automation percentage
Uses SQLite database at config.DATA_DIR / "metrics.db".
"""
import logging
import sqlite3
import time
from typing import Any, Dict, List, Optional

from backend import config

logger = logging.getLogger("mineintel.metrics_tracker")


class BaselineMetrics:
    """
    Service for recording and computing comparative performance metrics
    between manual geological reporting and sovereign AI generation.
    """

    def __init__(self, db_path: Optional[str] = None):
        if db_path:
            self.db_path = db_path
        else:
            config.DATA_DIR.mkdir(parents=True, exist_ok=True)
            self.db_path = str(config.DATA_DIR / "metrics.db")
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Returns SQLite connection with row_factory set for dictionary access."""
        conn = sqlite3.connect(self.db_path, timeout=10)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initializes the baseline_metrics table if not present."""
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS baseline_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        report_type VARCHAR(64) NOT NULL,
                        manual_minutes REAL,
                        manual_error_count INTEGER,
                        ai_seconds REAL,
                        extraction_accuracy REAL,
                        evidence_items_used INTEGER,
                        sections_generated INTEGER,
                        task_id VARCHAR(128),
                        created_at BIGINT NOT NULL
                    );
                """)
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_metrics_report_type 
                    ON baseline_metrics (report_type);
                """)
                conn.commit()
            logger.info(f"BaselineMetrics SQLite initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize metrics database: {e}")

    def record_manual_baseline(
        self,
        report_type: str,
        minutes: Optional[float] = None,
        error_count: Optional[int] = None
    ) -> Dict[str, Any]:
        """Records a human manual performance baseline for a report type."""
        now = int(time.time() * 1000)
        report_type_clean = (report_type or "default").strip().lower()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO baseline_metrics 
                (report_type, manual_minutes, manual_error_count, ai_seconds, extraction_accuracy, evidence_items_used, sections_generated, task_id, created_at)
                VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)
            """, (report_type_clean, minutes, error_count, now))
            record_id = cursor.lastrowid
            conn.commit()

        return {
            "id": record_id,
            "report_type": report_type_clean,
            "manual_minutes": minutes,
            "manual_error_count": error_count,
            "created_at": now
        }

    def record_ai_generation(
        self,
        report_type: str,
        ai_seconds: float,
        extraction_accuracy: float,
        evidence_items_used: int,
        sections_generated: int,
        task_id: str
    ) -> Dict[str, Any]:
        """Records AI report generation telemetry for an agent task."""
        now = int(time.time() * 1000)
        report_type_clean = (report_type or "default").strip().lower()

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO baseline_metrics 
                (report_type, manual_minutes, manual_error_count, ai_seconds, extraction_accuracy, evidence_items_used, sections_generated, task_id, created_at)
                VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?)
            """, (
                report_type_clean,
                round(float(ai_seconds), 3),
                round(float(extraction_accuracy), 2),
                int(evidence_items_used),
                int(sections_generated),
                task_id,
                now
            ))
            record_id = cursor.lastrowid
            conn.commit()

        return {
            "id": record_id,
            "report_type": report_type_clean,
            "ai_seconds": ai_seconds,
            "extraction_accuracy": extraction_accuracy,
            "evidence_items_used": evidence_items_used,
            "sections_generated": sections_generated,
            "task_id": task_id,
            "created_at": now
        }

    def _compute_for_type(self, conn: sqlite3.Connection, r_type: str) -> Dict[str, Any]:
        """Computes improvement metrics for a single report type."""
        # Get latest or average manual baseline
        cur = conn.cursor()
        cur.execute("""
            SELECT AVG(manual_minutes) as avg_manual, AVG(manual_error_count) as avg_errors, COUNT(*) as cnt
            FROM baseline_metrics
            WHERE report_type = ? AND manual_minutes IS NOT NULL;
        """, (r_type,))
        man_row = cur.fetchone()
        avg_manual = man_row["avg_manual"] if (man_row and man_row["avg_manual"]) else 480.0  # default 8 hrs baseline

        # Get AI telemetry
        cur.execute("""
            SELECT AVG(ai_seconds) as avg_ai_sec, AVG(extraction_accuracy) as avg_acc, COUNT(*) as cnt
            FROM baseline_metrics
            WHERE report_type = ? AND ai_seconds IS NOT NULL;
        """, (r_type,))
        ai_row = cur.fetchone()

        avg_ai_sec = ai_row["avg_ai_sec"] if (ai_row and ai_row["avg_ai_sec"] is not None) else 0.0
        avg_acc = ai_row["avg_acc"] if (ai_row and ai_row["avg_acc"] is not None) else 100.0
        ai_count = ai_row["cnt"] if ai_row else 0

        # Calculations
        if avg_manual > 0:
            time_reduction_pct = max(0.0, min(100.0, ((avg_manual - (avg_ai_sec / 60.0)) / avg_manual) * 100.0))
        else:
            time_reduction_pct = 0.0

        automation_pct = 100.0 if (avg_ai_sec > 0 or ai_count > 0) else 0.0

        return {
            "report_type": r_type,
            "time_reduction_pct": round(time_reduction_pct, 2),
            "accuracy_pct": round(avg_acc, 2),
            "automation_pct": round(automation_pct, 2),
            "manual_baseline_minutes": round(avg_manual, 1),
            "ai_generation_seconds": round(avg_ai_sec, 2),
            "ai_runs_count": ai_count
        }

    def compute_improvement(self, report_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Computes quantified improvement metrics:
        - time_reduction_pct: percentage time saved vs manual baseline
        - accuracy_pct: extraction precision score
        - automation_pct: completion percentage
        """
        with self._get_connection() as conn:
            if report_type:
                r_clean = report_type.strip().lower()
                return self._compute_for_type(conn, r_clean)

            # Aggregate across all known report types
            cur = conn.cursor()
            cur.execute("SELECT DISTINCT report_type FROM baseline_metrics;")
            types = [r["report_type"] for r in cur.fetchall()]
            if not types:
                types = ["default"]

            improvements = [self._compute_for_type(conn, t) for t in types]

            # Compute macro aggregate
            avg_time_red = sum(x["time_reduction_pct"] for x in improvements) / len(improvements) if improvements else 0.0
            avg_acc = sum(x["accuracy_pct"] for x in improvements) / len(improvements) if improvements else 100.0
            avg_auto = sum(x["automation_pct"] for x in improvements) / len(improvements) if improvements else 0.0

            return {
                "improvements": improvements,
                "aggregate": {
                    "time_reduction_pct": round(avg_time_red, 2),
                    "accuracy_pct": round(avg_acc, 2),
                    "automation_pct": round(avg_auto, 2),
                    "total_report_types": len(types)
                }
            }

    def list_baselines(self, limit: int = 100, report_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns recent baseline and AI generation metric records."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            if report_type:
                cur.execute("""
                    SELECT id, report_type, manual_minutes, manual_error_count, ai_seconds, extraction_accuracy, evidence_items_used, sections_generated, task_id, created_at
                    FROM baseline_metrics
                    WHERE report_type = ?
                    ORDER BY created_at DESC
                    LIMIT ?;
                """, (report_type.strip().lower(), limit))
            else:
                cur.execute("""
                    SELECT id, report_type, manual_minutes, manual_error_count, ai_seconds, extraction_accuracy, evidence_items_used, sections_generated, task_id, created_at
                    FROM baseline_metrics
                    ORDER BY created_at DESC
                    LIMIT ?;
                """, (limit,))
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    def health_check(self) -> Dict[str, Any]:
        """Returns metrics store health and record summary."""
        try:
            with self._get_connection() as conn:
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) as cnt FROM baseline_metrics;")
                total = cur.fetchone()["cnt"]
                cur.execute("SELECT DISTINCT report_type FROM baseline_metrics;")
                types = [r["report_type"] for r in cur.fetchall()]
                return {
                    "total_records": total,
                    "report_types": types
                }
        except Exception as e:
            logger.error(f"Metrics health check failed: {e}")
            return {
                "total_records": 0,
                "report_types": []
            }


# Singleton instance exported across modules
metrics_tracker = BaselineMetrics()
