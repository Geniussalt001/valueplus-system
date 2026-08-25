import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from do_delivery_cli import normalize_date


class DoDeliveryTest(unittest.TestCase):
    def test_normalize_buddhist_date(self):
        import re
        match = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})", "25/08/2569")
        self.assertEqual(normalize_date(match), ("25/08/2569", 2026, 8))


if __name__ == "__main__":
    unittest.main()
