"""
Phase 3 Local AI / Provider-Neutral Inference Foundation Test Suite.
Tests:
- Common inference/provider interface (BaseAIProvider, AIRequest, AIResponse)
- Local model adapter architecture (LocalOllamaProvider) with Ollama/GGUF compatibility
- Qwen3-8B text reasoning/summarization support
- Qwen3-VL-8B multimodal architecture for visual evidence
- Model availability/status detection
- Configurable provider/model selection via AIProviderRegistry
- Structured evidence-aware prompts grounding models in source facts
- AI output metadata linked to user/job/evidence (derived_from_ids)
- Separation of source facts vs AI-generated analysis/captions
- Graceful Model Unavailable behavior (zero fake fallback output)
- OpenRouter adapter behind provider abstraction
- Phase 0 authentication and ownership isolation on Phase 3 endpoints
"""

import base64
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from fastapi.responses import JSONResponse

from backend import config, auth_store
from backend.main import (
    get_ai_status_endpoint,
    generate_job_reasoning_endpoint,
    generate_image_caption_endpoint,
    AIReasoningRequest,
    AIMultimodalRequest,
)
from backend.services import ingestion_store, evidence_store
from backend.services.ai_inference_service import AIInferenceService
from backend.services.ai_providers.base import AIRequest, AIResponse, BaseAIProvider
from backend.services.ai_providers.local_ollama import LocalOllamaProvider
from backend.services.ai_providers.openrouter import OpenRouterProvider
from backend.services.ai_providers.registry import AIProviderRegistry
from backend.services.evidence_prompt_builder import (
    build_evidence_grounded_prompt,
    build_multimodal_caption_prompt,
)
from backend.services.evidence_models import StructuredEvidenceItem


class TestPhase3LocalAI(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp(prefix="mineintel_phase3_test_"))
        self.orig_data = config.DATA_DIR
        config.DATA_DIR = self.temp_dir / "data"
        config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        
        self.orig_ingest_store = ingestion_store.STORE_FILE
        self.orig_ev_store = evidence_store.EVIDENCE_FILE
        self.orig_auth_store = auth_store.USERS_FILE
        ingestion_store.STORE_FILE = config.DATA_DIR / "ingestion_store.json"
        evidence_store.EVIDENCE_FILE = config.DATA_DIR / "structured_evidence.json"
        auth_store.USERS_FILE = config.DATA_DIR / "users.json"

        self.pg_patch1 = patch.object(evidence_store, "is_postgres_configured", return_value=False)
        self.pg_patch2 = patch.object(ingestion_store, "is_postgres_configured", return_value=False)
        self.pg_patch3 = patch.object(auth_store, "is_postgres_configured", return_value=False)
        self.pg_patch1.start()
        self.pg_patch2.start()
        self.pg_patch3.start()

        # Seed test users
        auth_store.create_user(
            officer_id="OFFICER_A",
            password="PassA123!",
            role="Senior Officer",
            display_name="Auditor Alpha"
        )
        auth_store.create_user(
            officer_id="OFFICER_B",
            password="PassB123!",
            role="Senior Officer",
            display_name="Auditor Beta"
        )

        self.auth_a = {"officer_id": "OFFICER_A", "role": "Senior Officer"}
        self.auth_b = {"officer_id": "OFFICER_B", "role": "Senior Officer"}

    def tearDown(self):
        self.pg_patch1.stop()
        self.pg_patch2.stop()
        self.pg_patch3.stop()
        ingestion_store.STORE_FILE = self.orig_ingest_store
        evidence_store.EVIDENCE_FILE = self.orig_ev_store
        auth_store.USERS_FILE = self.orig_auth_store
        config.DATA_DIR = self.orig_data
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    # -------------------------------------------------------------------------
    # 1. Common Provider Interface Tests
    # -------------------------------------------------------------------------
    def test_ai_request_and_response_dataclasses(self):
        req = AIRequest(
            prompt="Analyze coal extraction data",
            system_prompt="You are a mining analyst.",
            model="qwen3:8b",
            temperature=0.3,
            max_tokens=500,
            images_base64=["base64imgdata"]
        )
        self.assertEqual(req.prompt, "Analyze coal extraction data")
        self.assertEqual(req.model, "qwen3:8b")
        self.assertEqual(len(req.images_base64), 1)

        resp = AIResponse(
            text="Total extracted: 450 tonnes",
            model="qwen3:8b",
            provider="local_ollama",
            prompt_tokens=50,
            completion_tokens=25,
            duration_seconds=0.42,
            metadata={"finish_reason": "stop"}
        )
        self.assertEqual(resp.text, "Total extracted: 450 tonnes")
        self.assertEqual(resp.total_tokens, 75)
        d = resp.to_dict()
        self.assertEqual(d["provider"], "local_ollama")
        self.assertEqual(d["total_tokens"], 75)

    # -------------------------------------------------------------------------
    # 2. LocalOllamaProvider (Qwen3-8B Text & Qwen3-VL-8B Multimodal)
    # -------------------------------------------------------------------------
    @patch("backend.services.ai_providers.local_ollama.requests.get")
    @patch("backend.services.ai_providers.local_ollama.requests.post")
    def test_local_ollama_text_reasoning_qwen3(self, mock_post, mock_get):
        # Mock status check
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "models": [{"name": "qwen3:8b"}, {"name": "qwen3-vl:8b"}]
        }

        # Mock generate endpoint
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "response": "Analysis based on [EV-1]: Production matches baseline.",
            "model": "qwen3:8b",
            "prompt_eval_count": 80,
            "eval_count": 35,
            "total_duration": 450000000,  # nanoseconds
            "done": True
        }

        provider = LocalOllamaProvider(host="http://localhost:11434", default_model="qwen3:8b")
        self.assertTrue(provider.is_available())

        req = AIRequest(prompt="Summarize production", model="qwen3:8b")
        resp = provider.generate(req)

        self.assertIn("Production matches baseline", resp.text)
        self.assertEqual(resp.model, "qwen3:8b")
        self.assertEqual(resp.provider, "local_ollama")
        self.assertEqual(resp.prompt_tokens, 80)
        self.assertEqual(resp.completion_tokens, 35)
        self.assertAlmostEqual(resp.duration_seconds, 0.45, places=2)

    @patch("backend.services.ai_providers.local_ollama.requests.get")
    @patch("backend.services.ai_providers.local_ollama.requests.post")
    def test_local_ollama_multimodal_caption_qwen3_vl(self, mock_post, mock_get):
        # Mock status check
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "models": [{"name": "qwen3-vl:8b"}]
        }

        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            "response": "Geological cross-section depicting open-cast coal seam at 45m depth.",
            "model": "qwen3-vl:8b",
            "prompt_eval_count": 120,
            "eval_count": 40,
            "total_duration": 600000000,
            "done": True
        }

        provider = LocalOllamaProvider(host="http://localhost:11434")
        req = AIRequest(
            prompt="Generate a factual caption for this visual evidence.",
            model="qwen3-vl:8b",
            images_base64=["iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="]
        )
        resp = provider.generate_multimodal(req)

        self.assertIn("Geological cross-section", resp.text)
        self.assertEqual(resp.model, "qwen3-vl:8b")

        # Verify POST payload sent images array to Ollama
        call_args = mock_post.call_args
        self.assertIsNotNone(call_args)
        body = call_args[1]["json"]
        self.assertEqual(body["model"], "qwen3-vl:8b")
        self.assertIn("images", body)
        self.assertEqual(len(body["images"]), 1)

    # -------------------------------------------------------------------------
    # 3. Graceful Model Unavailable Behavior (Zero Fake Output)
    # -------------------------------------------------------------------------
    @patch("backend.services.ai_providers.local_ollama.requests.get")
    @patch("backend.services.ai_providers.local_ollama.requests.post")
    def test_ollama_offline_behavior_never_generates_fake_data(self, mock_post, mock_get):
        import requests
        mock_get.side_effect = requests.exceptions.ConnectionError("Ollama connection refused")
        mock_post.side_effect = requests.exceptions.ConnectionError("Ollama connection refused")

        provider = LocalOllamaProvider(host="http://localhost:11434")
        self.assertFalse(provider.is_available())

        status = provider.get_status()
        self.assertFalse(status["available"])
        self.assertIn("instruction", status)
        self.assertIn("ollama serve", status["instruction"])

        req = AIRequest(prompt="Analyze coal reserves")
        resp = provider.generate(req)

        # Must strictly fail gracefully with model_unavailable and NEVER return fake/demo summary
        self.assertFalse(resp.success)
        self.assertEqual(resp.status, "model_unavailable")
        self.assertIn("offline", resp.error.lower())
        self.assertEqual(resp.text, "")

    @patch("backend.services.ai_providers.local_ollama.requests.get")
    @patch("backend.services.ai_providers.local_ollama.requests.post")
    def test_ollama_missing_model_behavior(self, mock_post, mock_get):
        # Ollama daemon is running, but model qwen3:8b is not pulled
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"models": [{"name": "llama3:latest"}]}

        mock_post.return_value.status_code = 404
        mock_post.text = "model 'qwen3:8b' not found, try pulling it first"
        mock_post.return_value.text = "model 'qwen3:8b' not found, try pulling it first"

        provider = LocalOllamaProvider(host="http://localhost:11434")
        models = provider.list_models()
        self.assertNotIn("qwen3:8b", models)

        req = AIRequest(prompt="Analyze", model="qwen3:8b")
        resp = provider.generate(req)

        self.assertFalse(resp.success)
        self.assertEqual(resp.status, "model_unavailable")
        self.assertIn("ollama pull qwen3:8b", resp.error)
        self.assertEqual(resp.text, "")

    # -------------------------------------------------------------------------
    # 4. OpenRouter Compatibility Adapter
    # -------------------------------------------------------------------------
    @patch("backend.services.ai_providers.openrouter.CloudAIClient")
    def test_openrouter_adapter_wrapping(self, mock_cloud_client_cls):
        mock_client = MagicMock()
        mock_cloud_client_cls.return_value = mock_client
        mock_client.generate.return_value = {
            "success": True,
            "text": "OpenRouter synthesis of production facts.",
            "tokens_used": 150,
            "prompt_tokens": 100,
            "completion_tokens": 50
        }

        provider = OpenRouterProvider(api_key="test-key", model="meta-llama/llama-3.3-70b-instruct")
        self.assertTrue(provider.is_available())

        req = AIRequest(prompt="Synthesize quarterly metrics")
        resp = provider.generate(req)

        self.assertEqual(resp.text, "OpenRouter synthesis of production facts.")
        self.assertEqual(resp.provider, "openrouter")
        self.assertEqual(resp.total_tokens, 150)

    # -------------------------------------------------------------------------
    # 5. AIProviderRegistry & Configurable Selection
    # -------------------------------------------------------------------------
    def test_registry_registration_and_selection(self):
        reg = AIProviderRegistry()
        mock_local = MagicMock(spec=BaseAIProvider)
        mock_local.is_available.return_value = True
        mock_local.get_status.return_value = {"available": True, "provider": "local_ollama"}

        mock_cloud = MagicMock(spec=BaseAIProvider)
        mock_cloud.is_available.return_value = True
        mock_cloud.get_status.return_value = {"available": True, "provider": "openrouter"}

        reg.register_provider("local_ollama", mock_local)
        reg.register_provider("openrouter", mock_cloud)

        # Auto resolution always returns local
        self.assertEqual(reg.get_provider("local_ollama"), mock_local)
        self.assertEqual(reg.get_provider("openrouter"), mock_local)
        
        auto_provider = reg.get_provider("auto")
        self.assertEqual(auto_provider, mock_local)

        # If local is not available, auto still returns local (Ollama ONLY)
        mock_local.is_available.return_value = False
        auto_fallback = reg.get_provider("auto")
        self.assertEqual(auto_fallback, mock_local)

    # -------------------------------------------------------------------------
    # 6. Structured Evidence-Aware Prompt Builder
    # -------------------------------------------------------------------------
    def test_evidence_prompt_builder_grounding(self):
        evidence_items = [
            {
                "evidence_id": "EV-001",
                "classification": "LOCKED FACT",
                "content": "Total seam thickness is 14.5 meters.",
                "provenance": {"filename": "borehole.csv", "page_number": 1}
            },
            {
                "evidence_id": "EV-002",
                "classification": "CALCULATED VALUE",
                "content": "Estimated reserve tonnage: 1,250,000 MT.",
                "provenance": {"filename": "calculations.xlsx", "sheet_name": "Reserves"}
            },
            {
                "evidence_id": "EV-003",
                "classification": "SUMMARIZABLE TEXT",
                "content": "Preliminary environmental survey notes no heavy metal leachate.",
                "provenance": {"filename": "env_report.pdf", "page_number": 4}
            }
        ]

        prompt, sys_inst, parent_ids = build_evidence_grounded_prompt(
            job_id="job-alpha",
            evidence_items=evidence_items,
            custom_instruction="Draft risk analysis."
        )

        self.assertIn("STRICT GROUNDING RULES", prompt)
        self.assertIn("EV-001", prompt)
        self.assertIn("Total seam thickness is 14.5 meters", prompt)
        self.assertIn("EV-002", prompt)
        self.assertIn("Estimated reserve tonnage", prompt)
        self.assertIn("EV-003", prompt)
        self.assertIn("Draft risk analysis", prompt)
        self.assertEqual(parent_ids, ["EV-001", "EV-002", "EV-003"])

    # -------------------------------------------------------------------------
    # 7. AI Inference Service & Derived Evidence Persistence
    # -------------------------------------------------------------------------
    def test_ai_inference_service_persists_derived_evidence(self):
        # Create an ingestion job and structured evidence
        ingestion_store.save_job({
            "job_id": "job-test-1",
            "owner_id": "OFFICER_A",
            "status": "completed",
            "total_files": 1,
            "completed_files": 1
        })

        fact_item = StructuredEvidenceItem(
            evidence_id="EV-FACT-01",
            file_id="file-1",
            job_id="job-test-1",
            owner_id="OFFICER_A",
            layer="processed",
            classification="LOCKED FACT",
            content_text="Daily coal output: 350 tons.",
            confidence=1.0,
            provenance={"filename": "daily.csv", "row_index": 2, "source_type": "csv"}
        )
        evidence_store.save_evidence_items([fact_item.to_dict()])

        # Mock provider
        mock_provider = MagicMock(spec=BaseAIProvider)
        mock_provider.is_available.return_value = True
        mock_provider.generate.return_value = AIResponse(
            text="The operation maintained steady production of 350 tons [EV-FACT-01].",
            model="qwen3:8b",
            provider="local_ollama",
            prompt_tokens=60,
            completion_tokens=25,
            duration_seconds=0.35
        )

        custom_registry = AIProviderRegistry()
        custom_registry.register_provider("local_ollama", mock_provider)
        inference_service = AIInferenceService(provider_registry=custom_registry)

        result = inference_service.generate_job_reasoning(
            job_id="job-test-1",
            owner_id="OFFICER_A",
            provider_name="local_ollama",
            model_name="qwen3:8b"
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["classification"], "AI ANALYSIS")
        self.assertEqual(result["layer"], "derived")
        self.assertEqual(result["derived_from_ids"], ["EV-FACT-01"])

        # Verify saved in evidence store
        derived_item = evidence_store.get_evidence_by_id(result["evidence_id"])
        self.assertIsNotNone(derived_item)
        self.assertEqual(derived_item["classification"], "AI ANALYSIS")
        self.assertEqual(derived_item["layer"], "derived")
        self.assertEqual(derived_item["confidence"], 0.85)  # AI Analysis must never have 1.0 confidence
        self.assertEqual(derived_item["metadata"]["ai_model"], "qwen3:8b")
        self.assertEqual(derived_item["metadata"]["ai_provider"], "local_ollama")

    # -------------------------------------------------------------------------
    # 8. Multimodal Visual Captioning Persistence
    # -------------------------------------------------------------------------
    def test_ai_multimodal_caption_persistence(self):
        # Create visual evidence item with raw image file
        img_path = Path(self.temp_dir) / "mine_face.png"
        img_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        img_path.write_bytes(img_bytes)

        img_item = StructuredEvidenceItem(
            evidence_id="EV-IMG-01",
            file_id="file-img-1",
            job_id="job-img-1",
            owner_id="OFFICER_A",
            layer="raw",
            classification="LOCKED FACT",
            content_text="Raw photographic evidence: mine_face.png",
            confidence=1.0,
            provenance={"filename": "mine_face.png", "raw_path": str(img_path), "source_type": "image"},
            raw_reference={"raw_path": str(img_path)}
        )
        evidence_store.save_evidence_items([img_item.to_dict()])

        mock_provider = MagicMock(spec=BaseAIProvider)
        mock_provider.is_available.return_value = True
        mock_provider.generate_multimodal.return_value = AIResponse(
            text="Highwall face showing horizontal coal seam stratification.",
            model="qwen3-vl:8b",
            provider="local_ollama",
            prompt_tokens=100,
            completion_tokens=30,
            duration_seconds=0.5
        )

        custom_registry = AIProviderRegistry()
        custom_registry.register_provider("local_ollama", mock_provider)
        inference_service = AIInferenceService(provider_registry=custom_registry)

        result = inference_service.generate_image_caption(
            evidence_id="EV-IMG-01",
            owner_id="OFFICER_A",
            provider_name="local_ollama",
            model_name="qwen3-vl:8b"
        )

        self.assertTrue(result["success"])
        self.assertEqual(result["classification"], "AI-GENERATED CAPTION")
        self.assertEqual(result["layer"], "derived")
        self.assertEqual(result["derived_from_ids"], ["EV-IMG-01"])

        # Check saved item
        saved_caption = evidence_store.get_evidence_by_id(result["evidence_id"])
        self.assertIsNotNone(saved_caption)
        self.assertEqual(saved_caption["classification"], "AI-GENERATED CAPTION")
        self.assertEqual(saved_caption["confidence"], 0.80)

    # -------------------------------------------------------------------------
    # 9. FastAPI Endpoints & Phase 0 Ownership Isolation
    # -------------------------------------------------------------------------
    def test_ai_status_endpoint(self):
        resp = get_ai_status_endpoint(auth=self.auth_a)
        self.assertTrue(resp["success"])
        self.assertIn("ai_status", resp)
        self.assertIn("active_provider", resp["ai_status"])

    def test_ai_reasoning_endpoint_ownership_isolation(self):
        # Create job owned by OFFICER_A
        ingestion_store.save_job({
            "job_id": "job-alpha-001",
            "owner_id": "OFFICER_A",
            "status": "completed",
            "total_files": 1,
            "completed_files": 1
        })
        evidence_store.save_evidence_items([{
            "evidence_id": "EV-A-01",
            "job_id": "job-alpha-001",
            "file_id": "f-1",
            "owner_id": "OFFICER_A",
            "layer": "processed",
            "classification": "LOCKED FACT",
            "source_type": "csv",
            "content": "Production rate: 100 tph",
            "confidence": 1.0,
            "provenance": {"filename": "data.csv"}
        }])

        # OFFICER_B attempts to generate reasoning over OFFICER_A's job -> 403 Forbidden
        req = AIReasoningRequest(job_id="job-alpha-001")
        with self.assertRaises(HTTPException) as ctx:
            generate_job_reasoning_endpoint(payload=req, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Forbidden", ctx.exception.detail)

    @patch("backend.services.ai_inference_service.ai_provider_registry.get_provider")
    def test_ai_reasoning_endpoint_graceful_unavailable(self, mock_get_provider):
        # Simulate local Ollama or model unavailable
        mock_provider = MagicMock(spec=BaseAIProvider)
        mock_provider.is_available.return_value = False
        mock_provider.generate.side_effect = RuntimeError(
            "Local Ollama service unavailable at http://localhost:11434. Please start it with 'ollama serve'."
        )
        mock_get_provider.return_value = mock_provider

        ingestion_store.save_job({
            "job_id": "job-alpha-002",
            "owner_id": "OFFICER_A",
            "status": "completed",
            "total_files": 1,
            "completed_files": 1
        })
        evidence_store.save_evidence_items([{
            "evidence_id": "EV-A-02",
            "job_id": "job-alpha-002",
            "file_id": "f-2",
            "owner_id": "OFFICER_A",
            "layer": "processed",
            "classification": "LOCKED FACT",
            "source_type": "csv",
            "content": "Haul distance: 2.4 km",
            "confidence": 1.0,
            "provenance": {"filename": "fleet.csv"}
        }])

        req = AIReasoningRequest(job_id="job-alpha-002")
        resp = generate_job_reasoning_endpoint(payload=req, auth=self.auth_a)
        # Should return JSONResponse with 503 status code and NO fake data
        self.assertIsInstance(resp, JSONResponse)
        self.assertEqual(resp.status_code, 503)
        data = json.loads(resp.body.decode("utf-8"))
        self.assertFalse(data["success"])
        self.assertEqual(data["status"], "model_unavailable")
        self.assertIn("ollama serve", data["error"])

    def test_ai_multimodal_endpoint_ownership_isolation(self):
        # Visual evidence owned by OFFICER_A
        evidence_store.save_evidence_items([{
            "evidence_id": "EV-IMG-OWNER-A",
            "job_id": "job-img-a",
            "file_id": "f-img-a",
            "owner_id": "OFFICER_A",
            "layer": "raw",
            "classification": "LOCKED FACT",
            "source_type": "image",
            "content": "Image evidence",
            "confidence": 1.0,
            "provenance": {"filename": "pit.jpg"}
        }])

        # OFFICER_B attempts to generate caption on OFFICER_A's image -> 403 Forbidden
        req = AIMultimodalRequest(evidence_id="EV-IMG-OWNER-A")
        with self.assertRaises(HTTPException) as ctx:
            generate_image_caption_endpoint(payload=req, auth=self.auth_b)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Forbidden", ctx.exception.detail)


if __name__ == "__main__":
    unittest.main()
