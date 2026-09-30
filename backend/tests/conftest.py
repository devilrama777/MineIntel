import os
import shutil
import tempfile

_TEST_DATA_DIR = tempfile.mkdtemp(prefix="mineintel_test_")
os.environ["MINEINTEL_TEST_MODE"] = "1"
os.environ["MINEINTEL_TEST_DATA_DIR"] = _TEST_DATA_DIR

def pytest_sessionfinish(session, exitstatus):
    shutil.rmtree(_TEST_DATA_DIR, ignore_errors=True)
