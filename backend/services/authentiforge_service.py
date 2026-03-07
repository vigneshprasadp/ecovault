import os
import cv2
import numpy as np
import uuid
import hashlib
from typing import Tuple

class AuthentiForgeService:
    def __init__(self, upload_dir="uploads/authentiforge"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    def validate_evidence(self, image_bytes: bytes, context_text: str = "") -> dict:
        """
        Processes an uploaded image through a simulated multi-layered AI ensemble.
        Returns validation scores, anonymized image path, and heatmap path.
        """
        # Save temp original image
        file_id = str(uuid.uuid4())
        orig_path = os.path.join(self.upload_dir, f"{file_id}_orig.jpg")
        with open(orig_path, "wb") as f:
            f.write(image_bytes)
            
        # Read image using cv2
        img = cv2.imread(orig_path)
        if img is None:
            raise ValueError("Invalid image file format.")
            
        h, w, _ = img.shape
        
        # 1. Privacy Preprocessor (Simulated via naive blurring of corners/regions)
        anonymized_img = img.copy()
        # Mock face/email blur by putting strong blur blocks randomly
        cv2.GaussianBlur(anonymized_img, (51, 51), 0, dst=anonymized_img) # Blur whole slightly
        # Or let's just make it look "anonymized" by blurring a central rectangle
        cw, ch = w//2, h//2
        roi = img[ch-50:ch+50, cw-100:cw+100]
        if roi.size > 0:
            blurred_roi = cv2.blur(roi, (25, 25))
            anonymized_img[ch-50:ch+50, cw-100:cw+100] = blurred_roi
            
        anon_path = os.path.join(self.upload_dir, f"{file_id}_anon.jpg")
        cv2.imwrite(anon_path, anonymized_img)
        
        # 2. Tamper Localization (Heatmap generation)
        # Create a mock heatmap (Red-to-Blue overlay)
        heatmap = np.zeros_like(img)
        # Add random red "hotspots" to simulate tampering
        center_x, center_y = np.random.randint(0, w), np.random.randint(0, h)
        cv2.circle(heatmap, (center_x, center_y), radius=w//4, color=(0, 0, 255), thickness=-1)
        heatmap_blurred = cv2.GaussianBlur(heatmap, (101, 101), 0)
        
        heatmap_overlay = cv2.addWeighted(img, 0.6, heatmap_blurred, 0.4, 0)
        heatmap_path = os.path.join(self.upload_dir, f"{file_id}_heatmap.jpg")
        cv2.imwrite(heatmap_path, heatmap_overlay)
        
        # 3. Ensemble Detection Pipeline (Simulated metrics based on file hash)
        file_hash = hashlib.sha256(image_bytes).hexdigest()
        deterministic_val = int(file_hash[:4], 16) / 65535.0  # random 0-1 based on file
        
        # Weighted votes
        freq_score = 0.5 + (deterministic_val * 0.4)
        sem_score = 0.6 + (np.random.rand() * 0.4)
        prov_score = 0.4 + (np.random.rand() * 0.5)
        
        integrity_score = (freq_score * 0.3) + (sem_score * 0.4) + (prov_score * 0.3)
        
        # Ethical Auditor (Simulated bias check)
        # 90% chance to pass bias audit to demonstrate feature
        bias_pass = np.random.rand() > 0.1 
        
        # Clean up original for privacy
        if os.path.exists(orig_path):
            os.remove(orig_path)
            
        return {
            "integrity_score": integrity_score,
            "semantic_score": sem_score,
            "frequency_score": freq_score,
            "provenance_score": prov_score,
            "is_tampered": integrity_score < 0.75,
            "bias_audit_pass": bias_pass,
            # We return dummy urls that point back to static files, 
            # or we could base64 encode them for frontend ease without needing a static folder.
            # Let's use base64 for ease of transport.
            "heatmap_url": self._image_to_base64(heatmap_path),
            "anonymized_url": self._image_to_base64(anon_path),
            "report_summary": "Analysis completed. Image exhibits signs of frequency manipulation consistent with JPEG re-saving." if integrity_score < 0.75 else "Image integrity verified. Metadata chain intact."
        }

    def _image_to_base64(self, filepath: str) -> str:
        import base64
        if not os.path.exists(filepath):
            return ""
        with open(filepath, "rb") as f:
            encoded = base64.b64encode(f.read()).decode('utf-8')
        return f"data:image/jpeg;base64,{encoded}"

authentiforge_service = AuthentiForgeService()
