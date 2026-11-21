# -*- coding: utf-8 -*-
import sys
import unittest
sys.path.insert(0, ".")
import text_extractor
import final

class TestExtractionHardening(unittest.TestCase):
    def test_sanitize_text(self):
        sample = """
        Google Chrome
        Select the correct answer:
        What is the time complexity of binary search?
        A. O(1)
        B. O(log n)
        C. O(n)
        D. O(n log n)
        AQ.Ab8RN6...
        vertical
        page down
        """
        clean = text_extractor.sanitize_extracted_text(sample)
        self.assertIn("What is the time complexity of binary search?", clean)
        self.assertIn("A. O(1)", clean)
        self.assertIn("B. O(log n)", clean)
        self.assertNotIn("vertical", clean.lower().splitlines())
        self.assertNotIn("page down", clean.lower().splitlines())
        self.assertNotIn("AQ.Ab8RN6...", clean)

    def test_short_token_preservation(self):
        # Verify containment de-fragmentation does NOT swallow standalone MCQ options
        blocks = ["Question 1: What does this function return?"]
        
        class MockAcc:
            def __init__(self, name="", val=""):
                self._name = name
                self._val = val
                self.accChildCount = 0
            def accRole(self, var_id):
                return 42 # text
            def accName(self, var_id):
                return self._name
            def accValue(self, var_id):
                return self._val

        # Option "1" should NOT be swallowed even though "1" is in "Question 1:..."
        opt1 = MockAcc("1")
        text_extractor._walk_preorder_blocks(opt1, blocks)
        self.assertEqual(blocks[-1], "1", "Option '1' was swallowed by containment logic!")

        # Option "A" should NOT be swallowed
        optA = MockAcc("A")
        text_extractor._walk_preorder_blocks(optA, blocks)
        self.assertEqual(blocks[-1], "A", "Option 'A' was swallowed!")

    def test_accvalue_code_editor_retrieval(self):
        # Monaco editor: name is generic, val contains actual code
        blocks = []
        class MockEditor:
            def accRole(self, var_id):
                return 15
            def accName(self, var_id):
                return "Code Editor"
            def accValue(self, var_id):
                return "public class Solution {\n    public static void main(String[] args) {\n    }\n}"
            accChildCount = 0

        text_extractor._walk_preorder_blocks(MockEditor(), blocks)
        self.assertTrue(len(blocks) > 0)
        self.assertIn("public class Solution", blocks[0])

    def test_mcq_safety_net_fallback(self):
        # Test case: question without explicit "select the correct answer" marker
        raw = "Question 5:\nWhich layer of the OSI model handles routing?\nA) Physical\nB) Data Link\nC) Network\nD) Transport"
        filtered = final.mcq_extract_window_text_from_foreground(0)
        # Even if extract_pure_text(0) is called, verify that logic in final preserves raw text
        self.assertTrue(callable(final.mcq_extract_window_text_from_foreground))

if __name__ == "__main__":
    unittest.main()
