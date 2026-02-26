# Hand Detection Application

A real-time hand detection application that uses your camera to detect hands and draws white lines on each finger.

## Features

- Real-time hand detection using MediaPipe
- Detects up to 2 hands simultaneously
- Draws white lines connecting finger joints
- Mirror effect for natural interaction
- Visual feedback with landmark points

## Requirements

- Python 3.8 or higher
- Webcam/Camera

## Installation

1. Create a virtual environment (recommended):
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
  ```bash
  venv\Scripts\activate
  ```
- macOS/Linux:
  ```bash
  source venv/bin/activate
  ```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

Run the application:
```bash
python hand_detection.py
```

### Controls

- **q**: Quit the application

## How It Works

1. **Hand Detection**: Uses Google's MediaPipe library to detect hand landmarks in real-time
2. **Finger Tracking**: Identifies 21 key points on each hand including:
   - Thumb (4 joints)
   - Index finger (4 joints)
   - Middle finger (4 joints)
   - Ring finger (4 joints)
   - Pinky (4 joints)
   - Wrist (1 point)
3. **Line Drawing**: Connects the landmarks with white lines to visualize the finger structure

## Troubleshooting

**Camera not opening:**
- Make sure no other application is using the camera
- Check camera permissions
- Try changing the camera index in `cv2.VideoCapture(0)` to 1 or 2

**Poor detection:**
- Ensure good lighting conditions
- Keep your hand within camera view
- Avoid cluttered backgrounds

## Technologies Used

- **OpenCV**: Computer vision library for camera access and image processing
- **MediaPipe**: Google's ML solution for hand tracking
- **NumPy**: Array operations and mathematical functions
