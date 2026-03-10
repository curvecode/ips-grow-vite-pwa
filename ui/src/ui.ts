import type { DailyBuy } from "@common/daily-buy.model";

export type Page = "add" | "list";

// Utility function
export function getCurrentDateTimeLocal(): string {
  const now = new Date();
  // Convert to local datetime-local format (YYYY-MM-DDTHH:mm)
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// UI rendering functions
export function renderApp(
  currentPage: Page,
  renderPageContent: () => string
): string {
  return `
    <div class="app-container">
      <header class="header">
        <h1>${currentPage === "add" ? "Add Entry" : "Daily Buys"}</h1>
        <div class="app-info-bar" id="appInfoBar">
          <div class="info-group">
            <span class="info-label">💻</span>
            <span id="computerInfo">Detecting...</span>
          </div>
          <div class="info-group">
            <span class="info-label">📍</span>
            <span id="locationInfo">Detecting...</span>
          </div>
        </div>
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
          <span class="theme-icon">🌙</span>
        </button>
      </header>
      
      <main class="main-content" id="mainContent">
        ${renderPageContent()}
      </main>
      
      <nav class="bottom-nav">
        <button class="nav-tab ${
          currentPage === "add" ? "active" : ""
        }" data-page="add">
          <span class="nav-icon">➕</span>
          <span class="nav-label">Add</span>
        </button>
        <button class="nav-tab ${
          currentPage === "list" ? "active" : ""
        }" data-page="list">
          <span class="nav-icon">📋</span>
          <span class="nav-label">List</span>
        </button>
      </nav>
    </div>
  `;
}

export function renderImageUploadSection(existingImage?: string): string {
  return `
    <div class="form-group">
      <label for="image">Image (optional) <span id="imageSize" class="image-size-badge"></span></label>
      <div class="image-upload-wrapper">
        <input 
          type="file" 
          id="imageInput" 
          name="image" 
          accept="image/*" 
          style="display: none;"
        />
        <div class="image-buttons" id="imageOptions">
          <button type="button" class="image-btn" id="uploadFileBtn">
            <span>📁</span> Album
          </button>
          <button type="button" class="image-btn" id="takePhotoBtn">
            <span>📷</span> Camera
          </button>
        </div>

        <!-- Inline Camera View -->
        <div id="cameraView" class="camera-view" style="display: none;">
          <video id="video" autoplay playsinline></video>
          <div class="camera-controls">
            <button type="button" class="capture-btn" id="shutterBtn">
              <span class="shutter-icon"></span>
            </button>
            <button type="button" class="close-camera-btn" id="cancelCameraBtn">✕</button>
          </div>
        </div>

        <div id="imagePreview" class="image-preview ${
          existingImage ? "active" : ""
        }">
          ${
            existingImage
              ? `<img src="${existingImage}" alt="Existing Photo" />`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

/**
 * Requests camera permission from the user
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn("Camera API not supported in this browser");
      return false;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Stop the stream immediately,เราแค่ต้องการขอ permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.error("Camera permission denied or error:", err);
    return false;
  }
}

export function renderAddPage(formData: Partial<DailyBuy>): string {
  return `
    <form class="form" id="dailyBuyForm">
      <div class="form-group">
        <label for="date">Date & Time</label>
        <input 
          type="datetime-local" 
          id="date" 
          name="date" 
          required 
          value="${formData.date || getCurrentDateTimeLocal()}"
        />
      </div>
      
      <div class="form-group">
        <label for="type">Type</label>
        <select id="type" name="type" required>
          <option value="food" ${
            formData.type === "food" ? "selected" : ""
          }>Food</option>
          <option value="beverage" ${
            formData.type === "beverage" ? "selected" : ""
          }>Beverage</option>
          <option value="snack" ${
            formData.type === "snack" ? "selected" : ""
          }>Snack</option>
          <option value="groceries" ${
            formData.type === "groceries" ? "selected" : ""
          }>Groceries</option>
          <option value="restaurant" ${
            formData.type === "restaurant" ? "selected" : ""
          }>Restaurant</option>
          <option value="coffee" ${
            formData.type === "coffee" ? "selected" : ""
          }>Coffee</option>
          <option value="other" ${
            formData.type === "other" ? "selected" : ""
          }>Other</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="price">Price (optional)</label>
        <input 
          type="number" 
          id="price" 
          name="price" 
          step="0.01" 
          min="0" 
          placeholder="0.00"
          value="${formData.price || ""}"
        />
      </div>
      
      <div class="form-group">
        <label for="quantity">Quantity (optional)</label>
        <input 
          type="number" 
          id="quantity" 
          name="quantity" 
          step="1" 
          min="1" 
          placeholder="1"
          value="${formData.quantity || ""}"
        />
      </div>
      
      <div class="form-group">
        <label for="description">Description (optional)</label>
        <textarea 
          id="description" 
          name="description" 
          rows="3" 
          placeholder="Add a note..."
        >${formData.description || ""}</textarea>
      </div>
      
      ${renderImageUploadSection(formData.image)}
      
      <button type="submit" class="submit-btn">${
        formData.id ? "Save Entry" : "Add Entry"
      }</button>
    </form>
  `;
}

// List page functions moved to pages/list.ts for lazy loading
