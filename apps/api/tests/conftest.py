import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///" + os.path.join(tempfile.mkdtemp(), "api.sqlite")
os.environ["INLINE_JOBS"] = "1"
os.environ["S3_ENABLED"] = "0"
os.environ["DATA_DIR"] = tempfile.mkdtemp()
