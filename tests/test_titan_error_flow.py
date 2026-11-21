import unittest
from unittest.mock import patch, MagicMock
import final

class TestTitanErrorFlow(unittest.TestCase):
    def test_call_vercel_bridge_captures_403_error(self):
        # Mock HTTP_SESSION.post
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_resp.json.return_value = {"success": False, "error": "License validation failed: License revoked"}

        with patch.object(final.HTTP_SESSION, 'post', return_value=mock_resp):
            res = final._call_vercel_bridge("test prompt")
            self.assertIsNone(res)
            self.assertEqual(final._LAST_BRIDGE_ERROR, "License validation failed: License revoked")

    def test_call_vercel_bridge_captures_network_failure(self):
        with patch.object(final.HTTP_SESSION, 'post', side_effect=Exception("Connection timed out")):
            res = final._call_vercel_bridge("test prompt")
            self.assertIsNone(res)
            self.assertIn("Bridge network failure", final._LAST_BRIDGE_ERROR)
            self.assertIn("Connection timed out", final._LAST_BRIDGE_ERROR)

    def test_call_vercel_bridge_succeeds_resets_error(self):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"success": True, "text": "public class Solution {}"}

        with patch.object(final.HTTP_SESSION, 'post', return_value=mock_resp):
            res = final._call_vercel_bridge("test prompt")
            self.assertEqual(res, "public class Solution {}")
            self.assertEqual(final._LAST_BRIDGE_ERROR, "")

if __name__ == '__main__':
    unittest.main()
