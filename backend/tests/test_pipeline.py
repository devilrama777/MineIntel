import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))


from backend.services.converter import MarkdownConverter
from backend.services.math_engine import MathEngine, safe_eval_expr
from backend.services.llama_client import LlamaClient
from backend.services.pipeline import DocumentPipeline


class TestPipeline(unittest.TestCase):

    def setUp(self):
        self.converter = MarkdownConverter()
        self.math_engine = MathEngine()
        self.llama_client = LlamaClient()
        self.pipeline = DocumentPipeline()
        self.test_data_dir = ROOT_DIR / "backend" / "tests" / "sample_data"
        self.test_data_dir.mkdir(parents=True, exist_ok=True)

    def test_safe_math_eval(self):
        """Test safe math evaluator on standard arithmetic expressions."""
        self.assertEqual(safe_eval_expr("10 + 20"), 30)
        self.assertEqual(safe_eval_expr("100 * 1.05"), 105.0)
        self.assertEqual(safe_eval_expr("(500 - 200) / 2"), 150.0)
        self.assertEqual(safe_eval_expr("2 ** 3"), 8)

    def test_math_verification_with_expected(self):
        """Test verification status when expected matches or mismatches."""
        # Match case
        res_pass = self.math_engine.verify_expression("150 + 250", expected_val=400.0)
        self.assertEqual(res_pass["status"], "VERIFIED")
        self.assertEqual(res_pass["calculated"], 400.0)

        # Mismatch case
        res_fail = self.math_engine.verify_expression("150 + 250", expected_val=450.0)
        self.assertEqual(res_fail["status"], "DISCREPANCY_DETECTED")
        self.assertEqual(res_fail["calculated"], 400.0)

    def test_math_flags_extraction(self):
        """Test extracting [MATH_CHECK: ... | formula: ...] pattern."""
        sample_text = (
            "The company saw revenue of $500k. "
            "[MATH_CHECK: Net Profit | formula: 500000 - 320000 = 180000]\n"
            "Operating margin: [MATH_CHECK: Margin | formula: (180000 / 500000) * 100]"
        )
        audit = self.math_engine.process_math_checks(sample_text)
        self.assertEqual(audit["total_checks"], 2)
        self.assertIn("Mathematical & Quantitative Audit Table", audit["audit_markdown"])

    def test_csv_to_markdown_conversion(self):
        """Test converting a sample CSV file into structured Markdown."""
        sample_csv = self.test_data_dir / "test_sales.csv"
        sample_csv.write_text(
            "Region,Quarter,Units_Sold,Unit_Price,Revenue\n"
            "North,Q1,120,45.0,5400.0\n"
            "South,Q1,85,45.0,3825.0\n"
            "East,Q1,140,50.0,7000.0\n"
            "West,Q1,95,50.0,4750.0\n",
            encoding="utf-8"
        )
        res = self.converter.convert_csv_to_markdown(sample_csv)
        self.assertEqual(res["file_type"], "csv")
        self.assertIn("test_sales.csv", res["markdown"])
        self.assertIn("Numerical Summary Statistics", res["markdown"])
        self.assertIn("| North | Q1 | 120 | 45.0 | 5400.0 |", res["markdown"])

    def test_openrouter_configuration_detection(self):
        """Verify OpenRouter provider and model defaults are correctly configured."""
        from backend import config
        from backend.services.cloud_ai_client import CloudAIClient
        self.assertEqual(config.AI_PROVIDER, "openrouter")
        self.assertEqual(config.OPENROUTER_MODEL, "openrouter/free")
        
        # When no key is set, client correctly reports unavailable
        client_no_key = CloudAIClient(api_key="", provider="openrouter")
        self.assertFalse(client_no_key.is_available())
        gen_res = client_no_key.generate(prompt="Test prompt")
        self.assertFalse(gen_res["success"])
        self.assertTrue(gen_res["is_fallback"])
        self.assertEqual(gen_res["status"], "missing_api_key")

    @patch("requests.post")
    def test_cloud_adapter_mocked_success(self, mock_post):
        """Verify CloudAIClient formats OpenRouter Chat Completions payload and parses 200 response successfully."""
        from backend.services.cloud_ai_client import CloudAIClient
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "gen-12345",
            "model": "dots-studio/dots-3-note-preview:free",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "### OpenRouter Analysis\nOperational metrics verified.\n[MATH_CHECK: Total Revenue | formula: 5400 + 3825 = 9225]"
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        client = CloudAIClient(api_key="mock_test_key_12345", model="openrouter/free", provider="openrouter")
        self.assertTrue(client.is_available())

        res = client.generate(
            prompt="Analyze sales data",
            system_instruction="You are an executive auditor."
        )
        self.assertTrue(res["success"])
        self.assertFalse(res["is_fallback"])
        self.assertEqual(res["model_used"], "openrouter/free")
        self.assertEqual(res.get("resolved_model"), "dots-studio/dots-3-note-preview:free")
        self.assertIn("OpenRouter Analysis", res["text"])
        self.assertIn("[MATH_CHECK: Total Revenue", res["text"])

        # Verify OpenRouter endpoint and Bearer auth header in mock call
        call_url = mock_post.call_args[0][0]
        call_headers = mock_post.call_args[1].get("headers", {})
        self.assertEqual(call_url, "https://openrouter.ai/api/v1/chat/completions")
        self.assertEqual(call_headers.get("Authorization"), "Bearer mock_test_key_12345")

    @patch("requests.post")
    def test_cloud_adapter_transient_error_and_backoff(self, mock_post):
        """Verify CloudAIClient handles 429/500 errors safely with bounded retry on OpenRouter."""
        from backend.services.cloud_ai_client import CloudAIClient
        mock_err_resp = MagicMock()
        mock_err_resp.status_code = 429
        mock_err_resp.text = "RESOURCE_EXHAUSTED: Rate limit exceeded"
        mock_post.return_value = mock_err_resp

        client = CloudAIClient(api_key="mock_test_key_12345", model="openrouter/free", provider="openrouter")
        with patch("time.sleep") as mock_sleep:
            res = client.generate(prompt="Analyze data")
            self.assertFalse(res["success"])
            self.assertTrue(res["is_fallback"])
            self.assertEqual(res["status"], "error")
            self.assertIn("HTTP 429", res["error"])
            # Verified bounded backoff attempts
            self.assertTrue(mock_sleep.called)

    def test_offline_deterministic_fallback_preservation(self):
        """Verify LLaMA and Gemma clients cleanly fall back to deterministic extraction when offline."""
        from backend.services.gemma_client import GemmaClient
        # Offline llama client with invalid base_url and no cloud key
        offline_llama = LlamaClient(base_url="http://127.0.0.1:59999")
        offline_llama.cloud_client.api_key = ""
        analysis_res = offline_llama.analyze_document(
            markdown_content="# Section 1\n| Col1 | Col2 |\n| 100 | 200 |",
            file_type="csv"
        )
        self.assertTrue(analysis_res["success"])
        self.assertTrue(analysis_res["is_fallback"])
        self.assertEqual(analysis_res["status"], "deterministic_fallback")
        self.assertIn("Deterministic Extraction", analysis_res["analysis"])

        # Offline gemma client
        offline_gemma = GemmaClient(base_url="http://127.0.0.1:59999")
        offline_gemma.cloud_client.api_key = ""
        report_res = offline_gemma.generate_systematic_report(
            llama_analysis=analysis_res["analysis"],
            math_audit_markdown="| Check | Result |\n| Sum | 300 |"
        )
        self.assertTrue(report_res["success"])
        self.assertTrue(report_res["is_fallback"])
        self.assertEqual(report_res["status"], "deterministic_fallback")
        self.assertIn("Deterministic Executive Reporting Engine", report_res["final_report"])


if __name__ == "__main__":
    unittest.main()

