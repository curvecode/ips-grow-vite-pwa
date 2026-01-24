<template>
  <section class="address">
    <div class="container">
      <h2 class="section-title">Visit Us</h2>
      <p class="section-subtitle">Come and enjoy our bubble tea in person</p>
      <div class="address-content">
        <div class="address-info">
          <div class="info-item">
            <div class="info-icon">📍</div>
            <div class="info-text">
              <h3>Location</h3>
              <p>123 Bubble Tea Street<br>Taiwan District, City 12345</p>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon">🕐</div>
            <div class="info-text">
              <h3>Opening Hours</h3>
              <p>Monday - Friday: 10:00 AM - 9:00 PM<br>Saturday - Sunday: 11:00 AM - 10:00 PM</p>
            </div>
          </div>
          <div class="info-item">
            <div class="info-icon">📞</div>
            <div class="info-text">
              <h3>Contact</h3>
              <p>Phone: (555) 123-4567<br>Email: hello@simplemilktea.com</p>
            </div>
          </div>
        </div>
        <div class="map-placeholder">
          <div class="map-icon">🗺️</div>
          <p>Map View</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Address section component
</script>

<style scoped>
.address {
  background: #2d8659;
  color: white;
  padding: 5rem 2rem;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 3rem;
  color: white;
  text-align: center;
  margin-bottom: 1rem;
  font-weight: 700;
}

.section-subtitle {
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  margin-bottom: 3rem;
}

.address-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  margin-top: 3rem;
}

.address-info {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.info-item {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.info-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.info-text h3 {
  font-size: 1.5rem;
  margin-bottom: 0.75rem;
  color: white;
  font-weight: 600;
}

.info-text p {
  font-size: 1.1rem;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.map-placeholder {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 4rem;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.map-icon {
  font-size: 6rem;
  margin-bottom: 1rem;
}

.map-placeholder p {
  font-size: 1.2rem;
  color: white;
  margin: 0;
}

@media (max-width: 768px) {
  .address-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .section-title {
    font-size: 2rem;
  }
  
  .map-icon {
    font-size: 4rem;
  }
}
</style>
