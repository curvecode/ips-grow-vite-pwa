"""
Eye Detection Module
Detects eyes and determines if they are open or closed
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
import urllib.request
import os


class EyeDetector:
    def __init__(self):
        """Initialize eye detection using MediaPipe FaceMesh"""
        # Download face landmarker model if not exists
        model_path = 'face_landmarker.task'
        if not os.path.exists(model_path):
            print("Downloading face landmarker model...")
            url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
            try:
                urllib.request.urlretrieve(url, model_path)
                print("Face landmarker model downloaded!")
            except Exception as e:
                print(f"Warning: Could not download face model ({e})")
                return
        
        # Create face landmarker
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.FaceLandmarkerOptions(
            base_options=base_options,
            num_faces=1,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.detector = vision.FaceLandmarker.create_from_options(options)
        
        # Eye landmark indices (based on MediaPipe FaceMesh)
        # Left eye: 33, 130, 133, 155, 158, 159, 160, 161, 246, 247, 248
        # Right eye: 362, 359, 366, 388, 391, 392, 393, 394, 466, 467, 468
        self.left_eye_indices = [33, 160, 158, 133, 153, 144]  # Key points for left eye
        self.right_eye_indices = [362, 385, 387, 362, 380, 373]  # Key points for right eye

    def draw_eyes(self, frame, face_landmarks):
        """Draw eye landmarks on frame"""
        h, w, c = frame.shape
        
        # Get landmark positions
        landmarks = []
        for landmark in face_landmarks:
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            landmarks.append((x, y))
        
        # Draw left eye
        left_eye_points = [landmarks[idx] for idx in self.left_eye_indices if idx < len(landmarks)]
        if left_eye_points:
            for point in left_eye_points:
                cv2.circle(frame, point, 3, (0, 255, 255), -1)
            # Draw contour
            contour = np.array(left_eye_points, dtype=np.int32)
            cv2.polylines(frame, [contour], False, (0, 255, 255), 2)
        
        # Draw right eye
        right_eye_points = [landmarks[idx] for idx in self.right_eye_indices if idx < len(landmarks)]
        if right_eye_points:
            for point in right_eye_points:
                cv2.circle(frame, point, 3, (255, 0, 255), -1)
            # Draw contour
            contour = np.array(right_eye_points, dtype=np.int32)
            cv2.polylines(frame, [contour], False, (255, 0, 255), 2)

    def is_eye_open(self, landmarks, eye_indices):
        """Determine if eye is open based on landmark positions
        
        Args:
            landmarks: List of facial landmarks
            eye_indices: List of indices for eye points
        
        Returns:
            True if eye is open, False if closed
        """
        if not eye_indices or len(landmarks) == 0:
            return True
        
        # Filter valid indices
        valid_indices = [idx for idx in eye_indices if idx < len(landmarks)]
        if len(valid_indices) < 3:
            return True
        
        # Calculate eye aspect ratio
        # Get vertical distances (top-bottom)
        top_point = landmarks[valid_indices[1]]
        bottom_point = landmarks[valid_indices[2]]
        
        # Get horizontal distance (left-right)
        left_point = landmarks[valid_indices[0]]
        right_point = landmarks[valid_indices[-1]]
        
        vertical_dist = abs(top_point.y - bottom_point.y)
        horizontal_dist = abs(right_point.x - left_point.x)
        
        # Eye aspect ratio threshold (empirically determined)
        # If vertical distance is too small relative to horizontal, eye is closed
        eye_aspect_ratio = vertical_dist / (horizontal_dist + 1e-6)
        threshold = 0.05  # Lower threshold to detect open eyes correctly
        
        return eye_aspect_ratio > threshold

    def process_frame(self, frame):
        """Process frame and detect eyes
        
        Args:
            frame: Input frame from camera
        
        Returns:
            Dictionary with eye detection results and annotated frame
        """
        result = {
            'frame': frame,
            'left_eye_open': False,
            'right_eye_open': False,
            'eyes_detected': False
        }
        
        try:
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Create MediaPipe image
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            
            # Detect face landmarks
            detection_result = self.detector.detect(mp_image)
            
            if detection_result.face_landmarks:
                face_landmarks = detection_result.face_landmarks[0]
                result['eyes_detected'] = True
                
                # Draw eye landmarks
                self.draw_eyes(frame, face_landmarks)
                
                # Check if eyes are open
                result['left_eye_open'] = self.is_eye_open(face_landmarks, self.left_eye_indices)
                result['right_eye_open'] = self.is_eye_open(face_landmarks, self.right_eye_indices)
            
            result['frame'] = frame
            return result
        
        except Exception as e:
            print(f"Error in eye detection: {e}")
            return result
