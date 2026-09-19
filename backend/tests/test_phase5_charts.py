"""
MineIntel Phase 5: Chart Intelligence & Visualization Engine Comprehensive Unit Tests

Tests:
1. Tabular evidence detection and column dimension analysis
2. Chart recommendation heuristics and rejection criteria
3. Deterministic chart data calculation (zero AI numerical fabrication)
4. Misleading chart rejection (e.g. pie chart > 8 slices, negative slices)
5. Headless Matplotlib rendering (PNG & SVG artifact generation)
6. Provenance preservation: chart -> calculation -> source evidence items
7. Persistence store (Neon PostgreSQL + local fallback)
8. REST API endpoints and Phase 0 user ownership isolation (403 on cross-user access)
"""

import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.responses import FileResponse

from backend import auth_store, config
from backend.main import (
    ChartGenerateRequest,
    ChartRecommendRequest,
    delete_chart_endpoint,
    detect_job_charts_endpoint,
    generate_chart_endpoint,
    get_chart_endpoint,
    get_chart_image_endpoint,
    list_job_charts_endpoint,
    recommend_chart_endpoint,
)
from backend.services import chart_store, evidence_store, ingestion_store
from backend.services.chart_calculator import chart_calculator
from backend.services.chart_detector import chart_detector
from backend.services.chart_models import (
    ChartConfig,
    ChartDimensionType,
    ChartType,
    ColumnAnalysis,
    TableCandidate,
)
from backend.services.chart_renderer import CHARTS_DIR, chart_renderer
from backend.services.chart_service import chart_service


class TestPhase5Charts(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.orig_data = config.DATA_DIR
        config.DATA_DIR = Path(self.temp_dir)

        self.orig_ingest_store = ingestion_store.STORE_FILE
        self.orig_ev_store = evidence_store.EVIDENCE_FILE
        self.orig_auth_store = auth_store.USERS_FILE
        self.orig_chart_store = chart_store.CHARTS_FILE

        ingestion_store.STORE_FILE = Path(self.temp_dir) / "ingestion_store.json"
        evidence_store.EVIDENCE_FILE = Path(self.temp_dir) / "evidence_store.json"
        auth_store.USERS_FILE = Path(self.temp_dir) / "users.json"
        chart_store.CHARTS_FILE = Path(self.temp_dir) / "charts_store.json"

        # Mock Postgres to ensure local store behavior
        self.pg_p1 = patch.object(chart_store, "is_postgres_configured", return_value=False)
        self.pg_p2 = patch.object(evidence_store, "is_postgres_configured", return_value=False)
        self.pg_p3 = patch.object(ingestion_store, "is_postgres_configured", return_value=False)
        self.pg_p4 = patch.object(auth_store, "is_postgres_configured", return_value=False)
        self.pg_p1.start()
        self.pg_p2.start()
        self.pg_p3.start()
        self.pg_p4.start()

        # Seed test users
        auth_store.create_user(
            officer_id="OFFICER_A",
            password="PassA123!",
            role="Operational Auditor",
            display_name="Auditor Alpha"
        )
        auth_store.create_user(
            officer_id="OFFICER_B",
            password="PassB123!",
            role="Operational Auditor",
            display_name="Auditor Beta"
        )

        self.auth_a = {"officer_id": "OFFICER_A", "role": "Operational Auditor"}
        self.auth_b = {"officer_id": "OFFICER_B", "role": "Operational Auditor"}

    def tearDown(self):
        self.pg_p1.stop()
        self.pg_p2.stop()
        self.pg_p3.stop()
        self.pg_p4.stop()
        ingestion_store.STORE_FILE = self.orig_ingest_store
        evidence_store.EVIDENCE_FILE = self.orig_ev_store
        auth_store.USERS_FILE = self.orig_auth_store
        chart_store.CHARTS_FILE = self.orig_chart_store
        config.DATA_DIR = self.orig_data
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # 1. Chart Detection & Column Analysis Tests
    # -------------------------------------------------------------------------
    def test_column_analysis_and_type_detection(self):
        sample_rows = [
            {"date": "2024-01-01", "colliery": "Mine Alpha", "production_mt": 125.5, "dispatch_mt": 110.0},
            {"date": "2024-01-02", "colliery": "Mine Beta", "production_mt": 95.0, "dispatch_mt": 90.5},
            {"date": "2024-01-03", "colliery": "Mine Gamma", "production_mt": 150.2, "dispatch_mt": 140.8},
        ]
        cols = chart_detector.analyze_columns(sample_rows)
        col_map = {c.name: c for c in cols}

        # Verify dimensions
        self.assertIn("date", col_map)
        self.assertEqual(col_map["date"].dimension_type, ChartDimensionType.TEMPORAL.value)
        self.assertTrue(col_map["date"].is_time_series)

        self.assertIn("colliery", col_map)
        self.assertEqual(col_map["colliery"].dimension_type, ChartDimensionType.CATEGORICAL.value)

        self.assertIn("production_mt", col_map)
        self.assertEqual(col_map["production_mt"].dimension_type, ChartDimensionType.NUMERIC.value)
        self.assertEqual(col_map["production_mt"].min_value, 95.0)
        self.assertEqual(col_map["production_mt"].max_value, 150.2)

        # Verify recommendations
        recommended = chart_detector.recommend_chart_types_for_table(cols, row_count=3)
        self.assertIn(ChartType.TIME_SERIES.value, recommended)
        self.assertIn(ChartType.LINE.value, recommended)
        self.assertIn(ChartType.BAR.value, recommended)
        self.assertIn(ChartType.GROUPED_BAR.value, recommended)
        self.assertIn(ChartType.SCATTER.value, recommended)

    # -------------------------------------------------------------------------
    # 2. Deterministic Calculation & Integrity Validation Tests
    # -------------------------------------------------------------------------
    def test_deterministic_calculation_zero_ai_numbers(self):
        rows = [
            {"quarter": "Q1", "production": 100.0, "cost": 50.0},
            {"quarter": "Q1", "production": 150.0, "cost": 70.0},
            {"quarter": "Q2", "production": 200.0, "cost": 90.0},
        ]
        calc, errors = chart_calculator.calculate(
            rows=rows,
            x_col="quarter",
            y_cols=["production", "cost"],
            chart_type="bar",
            agg_func="sum"
        )
        self.assertEqual(len(errors), 0)
        self.assertIsNotNone(calc)
        self.assertEqual(calc.computed_data["labels"], ["Q1", "Q2"])
        series = calc.computed_data["series"]
        self.assertEqual(len(series), 2)
        # Q1 production: 100 + 150 = 250
        self.assertEqual(series[0]["name"], "production")
        self.assertEqual(series[0]["data"], [250.0, 200.0])
        # Q1 cost: 50 + 70 = 120
        self.assertEqual(series[1]["name"], "cost")
        self.assertEqual(series[1]["data"], [120.0, 90.0])

        # Mathematical formula verification
        self.assertIn("SUM(production, cost) GROUP BY quarter", calc.aggregation_formula)

    def test_rejection_of_misleading_charts(self):
        # 1. Rejection of Pie chart with negative values
        neg_rows = [
            {"category": "Pit A", "profit": 100.0},
            {"category": "Pit B", "profit": -40.0}
        ]
        calc_neg, errors_neg = chart_calculator.calculate(
            rows=neg_rows,
            x_col="category",
            y_cols=["profit"],
            chart_type="pie"
        )
        self.assertIsNone(calc_neg)
        self.assertTrue(any("negative" in err.lower() for err in errors_neg))

        # 2. Rejection of Pie chart with > 8 slices
        many_rows = [{"mine": f"Mine {i}", "tonnage": 10.0} for i in range(12)]
        calc_slices, errors_slices = chart_calculator.calculate(
            rows=many_rows,
            x_col="mine",
            y_cols=["tonnage"],
            chart_type="pie"
        )
        self.assertIsNone(calc_slices)
        self.assertTrue(any("slices" in err.lower() for err in errors_slices))

    # -------------------------------------------------------------------------
    # 3. Headless Matplotlib Rendering Tests
    # -------------------------------------------------------------------------
    def test_chart_renderer_produces_real_artifacts(self):
        cfg = ChartConfig(
            chart_id="CHART-RENDER-TEST-01",
            job_id="job-test",
            owner_id="OFFICER_A",
            chart_type=ChartType.BAR.value,
            title="Monthly Production Output",
            subtitle="Fiscal Year 2023-24",
            x_axis_label="Month",
            y_axis_label="Tonnage",
            unit="MT",
            theme="mineintel_dark"
        )
        labels = ["Jan", "Feb", "Mar"]
        series = [{"name": "Coal Output", "data": [120.5, 135.2, 142.8]}]

        png_path, svg_path = chart_renderer.render(cfg, labels, series)

        self.assertTrue(Path(png_path).exists())
        self.assertTrue(Path(svg_path).exists())
        self.assertGreater(Path(png_path).stat().st_size, 1000)
        self.assertGreater(Path(svg_path).stat().st_size, 1000)

        # Clean up
        Path(png_path).unlink(missing_ok=True)
        Path(svg_path).unlink(missing_ok=True)

    def test_rendering_all_chart_types(self):
        """Validates that all supported chart types render without exception."""
        test_types = [
            ChartType.LINE.value,
            ChartType.TIME_SERIES.value,
            ChartType.GROUPED_BAR.value,
            ChartType.STACKED_BAR.value,
            ChartType.AREA.value,
            ChartType.DONUT.value,
            ChartType.SCATTER.value
        ]
        labels = ["M1", "M2", "M3", "M4"]
        series = [
            {"name": "Series 1", "data": [10.0, 20.0, 15.0, 30.0]},
            {"name": "Series 2", "data": [5.0, 12.0, 8.0, 18.0]}
        ]

        for ct in test_types:
            cfg = ChartConfig(
                chart_id=f"CHART-TYPE-{ct}",
                job_id="job-test",
                owner_id="OFFICER_A",
                chart_type=ct,
                title=f"Test {ct.upper()}"
            )
            use_series = [series[0]] if ct in [ChartType.DONUT.value, ChartType.PIE.value] else series
            png_path, svg_path = chart_renderer.render(cfg, labels, use_series)
            self.assertTrue(Path(png_path).exists(), f"Failed rendering {ct}")
            Path(png_path).unlink(missing_ok=True)
            Path(svg_path).unlink(missing_ok=True)

    # -------------------------------------------------------------------------
    # 4. Persistence & Provenance Tests
    # -------------------------------------------------------------------------
    def test_chart_provenance_and_persistence(self):
        # Create structured evidence item with CSV row facts
        ingestion_store.save_job({
            "job_id": "job-chart-01",
            "owner_id": "OFFICER_A",
            "status": "completed",
            "total_files": 1,
            "completed_files": 1
        })
        evidence_items = [
            {
                "evidence_id": "EV-ROW-1",
                "job_id": "job-chart-01",
                "file_id": "file-csv-1",
                "owner_id": "OFFICER_A",
                "layer": "processed",
                "classification": "LOCKED FACT",
                "content_json": {"mine": "Kusmunda", "production_mt": 35.2, "dispatch_mt": 34.0},
                "provenance": {"filename": "collieries.csv", "source_type": "csv"}
            },
            {
                "evidence_id": "EV-ROW-2",
                "job_id": "job-chart-01",
                "file_id": "file-csv-1",
                "owner_id": "OFFICER_A",
                "layer": "processed",
                "classification": "LOCKED FACT",
                "content_json": {"mine": "Gevra", "production_mt": 48.6, "dispatch_mt": 47.1},
                "provenance": {"filename": "collieries.csv", "source_type": "csv"}
            }
        ]
        evidence_store.save_evidence_items(evidence_items)

        # Generate chart
        res = chart_service.generate_chart(
            job_id="job-chart-01",
            owner_id="OFFICER_A",
            file_id="file-csv-1",
            x_col="mine",
            y_cols=["production_mt", "dispatch_mt"],
            chart_type="grouped_bar",
            title="Mega Mines Production & Dispatch",
            unit="MT"
        )
        self.assertTrue(res["success"])
        chart_id = res["chart_id"]

        # Retrieve saved chart
        saved = chart_store.get_chart(chart_id, owner_id="OFFICER_A")
        self.assertIsNotNone(saved)
        self.assertEqual(saved["config"]["chart_type"], "grouped_bar")
        self.assertEqual(saved["calculation"]["computed_data"]["labels"], ["Kusmunda", "Gevra"])

        # Check provenance chain
        prov_chain = saved["calculation"]["provenance_chain"]
        self.assertTrue(len(prov_chain) >= 2)
        self.assertIn("collieries.csv", saved["calculation"]["source_files"])
        self.assertIn("EV-ROW-1", saved["calculation"]["source_evidence_ids"])

        # List charts
        all_charts = chart_store.list_charts_for_job("job-chart-01", owner_id="OFFICER_A")
        self.assertEqual(len(all_charts), 1)
        self.assertEqual(all_charts[0]["chart_id"], chart_id)

    # -------------------------------------------------------------------------
    # 5. REST API Endpoints & Phase 0 User Ownership Isolation Tests
    # -------------------------------------------------------------------------
    def test_chart_endpoints_and_ownership_isolation(self):
        # 1. Seed job and evidence for OFFICER_A
        ingestion_store.save_job({
            "job_id": "job-sec-charts",
            "owner_id": "OFFICER_A",
            "status": "completed",
            "total_files": 1,
            "completed_files": 1
        })
        evidence_store.save_evidence_items([
            {
                "evidence_id": "EV-SEC-1",
                "job_id": "job-sec-charts",
                "file_id": "file-sec-1",
                "owner_id": "OFFICER_A",
                "layer": "processed",
                "classification": "LOCKED FACT",
                "content_json": {"state": "Jharkhand", "coal_mt": 120.0},
                "provenance": {"filename": "states.csv", "source_type": "csv"}
            },
            {
                "evidence_id": "EV-SEC-2",
                "job_id": "job-sec-charts",
                "file_id": "file-sec-1",
                "owner_id": "OFFICER_A",
                "layer": "processed",
                "classification": "LOCKED FACT",
                "content_json": {"state": "Odisha", "coal_mt": 145.0},
                "provenance": {"filename": "states.csv", "source_type": "csv"}
            }
        ])

        # 2. Detect tables as OFFICER_A
        det_res = detect_job_charts_endpoint(job_id="job-sec-charts", auth=self.auth_a)
        self.assertTrue(det_res["success"])
        self.assertEqual(det_res["tables_count"], 1)
        table_id = det_res["tables"][0]["table_id"]

        # 3. Recommend chart as OFFICER_A
        rec_req = ChartRecommendRequest(job_id="job-sec-charts", table_id=table_id, use_ai=False)
        rec_res = recommend_chart_endpoint(payload=rec_req, auth=self.auth_a)
        self.assertTrue(rec_res["success"])
        self.assertIn("recommended_chart_type", rec_res["recommendation"])

        # 4. Generate chart as OFFICER_A
        gen_req = ChartGenerateRequest(
            job_id="job-sec-charts",
            file_id="file-sec-1",
            x_col="state",
            y_cols=["coal_mt"],
            chart_type="bar",
            title="State-wise Coal Production"
        )
        gen_res = generate_chart_endpoint(payload=gen_req, auth=self.auth_a)
        self.assertTrue(gen_res["success"])
        chart_id = gen_res["chart_id"]

        # 5. Retrieve chart as OFFICER_A
        get_res = get_chart_endpoint(chart_id=chart_id, auth=self.auth_a)
        self.assertTrue(get_res["success"])
        self.assertEqual(get_res["chart"]["chart_id"], chart_id)

        # 6. List charts as OFFICER_A
        list_res = list_job_charts_endpoint(job_id="job-sec-charts", auth=self.auth_a)
        self.assertTrue(list_res["success"])
        self.assertEqual(list_res["charts_count"], 1)

        # 7. Serve chart image as OFFICER_A
        img_res = get_chart_image_endpoint(chart_id=chart_id, format="png", auth=self.auth_a)
        self.assertIsInstance(img_res, FileResponse)
        self.assertEqual(img_res.media_type, "image/png")

        # 8. CROSS-USER ISOLATION: OFFICER_B attempts access -> 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            detect_job_charts_endpoint(job_id="job-sec-charts", auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        with self.assertRaises(HTTPException) as ctx:
            recommend_chart_endpoint(payload=rec_req, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        with self.assertRaises(HTTPException) as ctx:
            generate_chart_endpoint(payload=gen_req, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        with self.assertRaises(HTTPException) as ctx:
            list_job_charts_endpoint(job_id="job-sec-charts", auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)

        with self.assertRaises(HTTPException) as ctx:
            get_chart_endpoint(chart_id=chart_id, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 404)  # 404/Forbidden for individual resource

        with self.assertRaises(HTTPException) as ctx:
            get_chart_image_endpoint(chart_id=chart_id, format="png", auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 404)

        with self.assertRaises(HTTPException) as ctx:
            delete_chart_endpoint(chart_id=chart_id, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 404)

        # 9. Clean deletion by OFFICER_A
        del_res = delete_chart_endpoint(chart_id=chart_id, auth=self.auth_a)
        self.assertTrue(del_res["success"])


if __name__ == "__main__":
    unittest.main()
