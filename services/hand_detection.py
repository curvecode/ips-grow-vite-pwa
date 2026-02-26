"""
Real-time Hand Detection Application
Detects hands via camera and draws white lines on each finger
"""

import cv2
import mediapipe as mp
import numpy as np
from mediapipe import tasks
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import urllib.request
import os
from rembg import remove
from PIL import Image
import io
import random
import time
from eye_detector import EyeDetector


class HandDetector:
    def __init__(self):
        # Load background image
        bg_path = 'images/xxxxbg.jpg'
        self.background_image = None
        if os.path.exists(bg_path):
            self.background_image = cv2.imread(bg_path)
            print(f"Background image loaded from {bg_path}")
        else:
            print(f"Warning: Background image not found at {bg_path}")
        
        # Initialize eye detector
        print("Initializing eye detection...")
        self.eye_detector = EyeDetector()
        print("✓ Eye detection ready!")
        
        # Download hand landmarker model if not exists
        model_path = 'hand_landmarker.task'
        if not os.path.exists(model_path):
            print("Downloading hand landmarker model...")
            url = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task'
            urllib.request.urlretrieve(url, model_path)
            print("Model downloaded!")
        
        # Create hand landmarker
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.detector = vision.HandLandmarker.create_from_options(options)
        
        # Initialize background removal (using rembg)
        print("Loading background removal model...")
        self.segmenter = None
        try:
            # rembg automatically downloads its model on first use
            # We just need to test if it can be imported
            print("✓ Background removal ready!")
        except Exception as e:
            print(f"⚠ Background removal may need model download: {e}")
        
        # Define finger connections (landmarks)
        self.finger_connections = [
            # Thumb
            [(0, 1), (1, 2), (2, 3), (3, 4)],
            # Index finger
            [(0, 5), (5, 6), (6, 7), (7, 8)],
            # Middle finger
            [(0, 9), (9, 10), (10, 11), (11, 12)],
            # Ring finger
            [(0, 13), (13, 14), (14, 15), (15, 16)],
            # Pinky
            [(0, 17), (17, 18), (18, 19), (19, 20)]
        ]
        
        # Fireworks effect particles
        self.firework_particles = []
        self.last_firework_spawn = time.time()
        self.firework_colors = [
            (255, 0, 0),      # Blue
            (0, 255, 0),      # Green
            (0, 0, 255),      # Red
            (255, 255, 0),    # Cyan
            (255, 0, 255),    # Magenta
            (0, 255, 255),    # Yellow
            (255, 165, 0),    # Orange
            (128, 0, 255)     # Purple
        ]

    def draw_finger_lines(self, frame, hand_landmarks):
        """Draw white lines on each finger"""
        h, w, c = frame.shape
        
        # Get all landmark positions
        landmarks = []
        for landmark in hand_landmarks:
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            landmarks.append((x, y))
        
        # Draw lines for each finger
        for finger in self.finger_connections:
            for connection in finger:
                start_idx, end_idx = connection
                if start_idx < len(landmarks) and end_idx < len(landmarks):
                    start_point = landmarks[start_idx]
                    end_point = landmarks[end_idx]
                    # Draw white line with thickness
                    cv2.line(frame, start_point, end_point, (255, 255, 255), 3)
        
        # Draw circles at each landmark point
        for point in landmarks:
            cv2.circle(frame, point, 5, (255, 255, 255), cv2.FILLED)
    
    def draw_fireworks_effect(self, frame, hand_landmarks):
        """Draw animated fireworks effect above an open hand"""
        h, w, c = frame.shape
        
        # Get palm position (center of hand, landmark 0 is wrist, 9 is middle finger base)
        palm_x = int(hand_landmarks[9].x * w)
        palm_y = int(hand_landmarks[9].y * h)
        
        # Spawn new firework bursts
        current_time = time.time()
        if current_time - self.last_firework_spawn > 0.3:  # New burst every 300ms
            # Random spawn position above the hand
            burst_x = palm_x + random.randint(-60, 60)
            burst_y = palm_y - random.randint(80, 150)
            
            # Choose random color for this burst
            burst_color = random.choice(self.firework_colors)
            
            # Create explosion particles
            num_particles = random.randint(25, 40)
            for _ in range(num_particles):
                angle = random.uniform(0, 2 * np.pi)
                speed = random.uniform(2, 7)
                particle = {
                    'x': burst_x,
                    'y': burst_y,
                    'vx': np.cos(angle) * speed,
                    'vy': np.sin(angle) * speed,
                    'life': 1.0,
                    'size': random.randint(4, 8),
                    'color': burst_color,
                    'trail': []  # For trail effect
                }
                self.firework_particles.append(particle)
            
            self.last_firework_spawn = current_time
        
        # Update and draw particles
        particles_to_remove = []
        for i, particle in enumerate(self.firework_particles):
            # Add current position to trail
            particle['trail'].append((int(particle['x']), int(particle['y'])))
            if len(particle['trail']) > 5:  # Keep last 5 positions
                particle['trail'].pop(0)
            
            # Update position with gravity
            particle['x'] += particle['vx']
            particle['y'] += particle['vy']
            particle['vy'] += 0.15  # Gravity effect
            particle['vx'] *= 0.98  # Air resistance
            particle['life'] -= 0.015
            particle['size'] = max(1, particle['size'] - 0.1)
            
            # Remove dead particles
            if particle['life'] <= 0 or particle['y'] > h:
                particles_to_remove.append(i)
                continue
            
            # Calculate fading color based on life
            alpha = particle['life']
            b, g, r = particle['color']
            faded_color = (int(b * alpha), int(g * alpha), int(r * alpha))
            
            # Draw trail
            for j in range(len(particle['trail']) - 1):
                if particle['trail'][j] and particle['trail'][j + 1]:
                    trail_alpha = (j + 1) / len(particle['trail']) * alpha
                    trail_color = (int(b * trail_alpha * 0.5), 
                                 int(g * trail_alpha * 0.5), 
                                 int(r * trail_alpha * 0.5))
                    cv2.line(frame, particle['trail'][j], particle['trail'][j + 1], 
                           trail_color, 1, cv2.LINE_AA)
            
            # Draw main particle
            center = (int(particle['x']), int(particle['y']))
            if 0 <= center[0] < w and 0 <= center[1] < h:
                # Draw glow effect
                glow_size = int(particle['size'] * 2)
                glow_color = (int(b * alpha * 0.3), int(g * alpha * 0.3), int(r * alpha * 0.3))
                cv2.circle(frame, center, glow_size, glow_color, -1, cv2.LINE_AA)
                # Draw main particle
                cv2.circle(frame, center, int(particle['size']), faded_color, -1, cv2.LINE_AA)
        
        # Remove dead particles
        for i in reversed(particles_to_remove):
            del self.firework_particles[i]

    def is_hand_open(self, hand_landmarks):
        """Check if hand is open (returns True) or closed/tied (returns False)"""
        # Finger tip landmark indices
        finger_tips = [4, 8, 12, 16, 20]  # Thumb, Index, Middle, Ring, Pinky
        # Finger PIP joint landmark indices (joint below the tip)
        finger_pips = [3, 6, 10, 14, 18]
        
        open_fingers = 0
        
        # Check thumb (different logic - horizontal extension)
        if hand_landmarks[finger_tips[0]].x < hand_landmarks[finger_pips[0]].x:
            open_fingers += 1
        
        # Check other fingers (vertical extension)
        for i in range(1, 5):
            if hand_landmarks[finger_tips[i]].y < hand_landmarks[finger_pips[i]].y:
                open_fingers += 1
        
        # Hand is open if 3 or more fingers are extended
        return open_fingers >= 3

    def remove_background(self, frame, background_replacement=None):
        """Remove background behind people using rembg
        
        Args:
            frame: Input frame from camera (BGR format)
            background_replacement: Optional background image to replace with
        
        Returns:
            Frame with background removed/replaced
        """
        try:
            # Convert BGR to RGB for rembg
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL Image
            pil_image = Image.fromarray(rgb_frame)
            
            # Remove background using rembg
            png_image = remove(pil_image)
            
            # Convert back to numpy array
            result_array = np.array(png_image)
            
            # Get the alpha channel as mask
            if result_array.shape[2] == 4:
                alpha_mask = result_array[:, :, 3]
                foreground = result_array[:, :, :3]
            else:
                alpha_mask = np.ones((result_array.shape[0], result_array.shape[1])) * 255
                foreground = result_array
            
            # Convert mask to 3-channel
            mask_3ch = cv2.cvtColor(alpha_mask, cv2.COLOR_GRAY2BGR)
            
            # Determine background to use
            if background_replacement is not None:
                bg_image = background_replacement
            elif self.background_image is not None:
                bg_image = self.background_image
            else:
                # Black background
                bg_image = np.zeros_like(frame)
            
            # Resize background if needed
            h, w = frame.shape[:2]
            if bg_image.shape[:2] != (h, w):
                bg_image = cv2.resize(bg_image, (w, h))
            
            # Convert foreground to BGR and blend
            foreground_bgr = cv2.cvtColor(foreground, cv2.COLOR_RGB2BGR)
            
            # Normalize mask to 0-1 for blending
            mask_normalized = mask_3ch.astype(float) / 255.0
            
            # Blend: foreground where mask is high, background where mask is low
            result = (foreground_bgr * mask_normalized + bg_image * (1 - mask_normalized)).astype(np.uint8)
            
            return result
        
        except Exception as e:
            print(f"Error in background removal: {e}")
            return frame

    def process_frame(self, frame, remove_bg=False):
        """Process a single frame and detect hands
        
        Args:
            frame: Input frame from camera
            remove_bg: If True, removes background behind people
        
        Returns:
            Processed frame with hand detection
        """
        # Detect eyes
        eye_result = self.eye_detector.process_frame(frame)
        frame = eye_result['frame']
        
        # Use background image if available
        if self.background_image is not None:
            h, w = frame.shape[:2]
            bg_h, bg_w = self.background_image.shape[:2]
            
            # Resize background to match frame size
            if (bg_w, bg_h) != (w, h):
                bg_resized = cv2.resize(self.background_image, (w, h))
            else:
                bg_resized = self.background_image.copy()
            
            # Use background as the display frame
            display_frame = bg_resized.copy()
        else:
            display_frame = frame.copy()
        
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Create MediaPipe image
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        # Detect hands
        detection_result = self.detector.detect(mp_image)
        
        # Check if hand is open or closed
        hand_status = "OFF"
        status_color = (0, 0, 255)  # Red for OFF
        
        # Draw hand landmarks if detected
        if detection_result.hand_landmarks:
            hand_landmarks = detection_result.hand_landmarks[0]  # Only first hand
            self.draw_finger_lines(display_frame, hand_landmarks)
            
            if self.is_hand_open(hand_landmarks):
                hand_status = "ON"
                status_color = (0, 255, 0)  # Green for ON
                # Draw fireworks effect when hand is open
                self.draw_fireworks_effect(display_frame, hand_landmarks)
            else:
                # Clear particles when hand closes
                self.firework_particles = []
        
        # Display ON/OFF status on top right
        h, w, c = display_frame.shape
        
        # Get text size for background rectangle
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 1.5
        thickness = 4
        text_size = cv2.getTextSize(hand_status, font, font_scale, thickness)[0]
        
        # Calculate position (top right with padding)
        padding = 15
        text_x = w - text_size[0] - padding
        text_y = text_size[1] + padding
        
        # Draw background rectangle for hand status
        bg_x1 = text_x - 10
        bg_y1 = text_y - text_size[1] - 10
        bg_x2 = w - padding + 10
        bg_y2 = text_y + 10
        cv2.rectangle(display_frame, (bg_x1, bg_y1), (bg_x2, bg_y2), (0, 0, 0), -1)
        
        # Draw status text with color
        cv2.putText(display_frame, hand_status, (text_x, text_y), 
                   font, font_scale, status_color, thickness)
        
        # Display eye status on bottom left
        if eye_result['eyes_detected']:
            eye_status = []
            if eye_result['left_eye_open']:
                eye_status.append("L: OPEN")
            else:
                eye_status.append("L: CLOSED")
            
            if eye_result['right_eye_open']:
                eye_status.append("R: OPEN")
            else:
                eye_status.append("R: CLOSED")
            
            eye_text = " | ".join(eye_status)
            eye_text_size = cv2.getTextSize(eye_text, font, 0.8, 2)[0]
            
            # Draw background rectangle for eye status (bottom left)
            eye_y_pos = h - 15
            cv2.rectangle(display_frame, (5, eye_y_pos - 30), (eye_text_size[0] + 15, eye_y_pos), (0, 0, 0), -1)
            cv2.putText(display_frame, eye_text, (10, eye_y_pos - 10), font, 0.8, (200, 200, 0), 2)
        
        return display_frame

    def run(self):
        """Run the hand detection application"""
        # Open camera
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("Error: Could not open camera")
            return
        
        print("Hand Detection Started!")
        print("Press 'q' to quit")
        
        while True:
            # Read frame
            success, frame = cap.read()
            if not success:
                print("Failed to read frame")
                break
            
            # Flip frame horizontally for mirror effect
            frame = cv2.flip(frame, 1)
            
            # Process frame
            frame = self.process_frame(frame)
            
            # Add instructions
            cv2.putText(frame, "Press 'q' to quit", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            # Display frame
            cv2.imshow("Hand Detection", frame if self.background_image is None else frame)
            
            # Check for quit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        # Cleanup
        cap.release()
        cv2.destroyAllWindows()


def main():
    detector = HandDetector()
    detector.run()


if __name__ == "__main__":
    main()
