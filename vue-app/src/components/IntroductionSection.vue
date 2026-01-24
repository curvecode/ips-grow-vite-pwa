<template>
  <section class="introduction">
    <div class="container">
      <div class="content">
        <h1 class="title">Simple Milktea</h1>
        <p class="subtitle">Authentic Bubble Tea Experience</p>
        <p class="description">
          Discover the perfect blend of premium tea leaves, fresh milk, and chewy tapioca pearls. 
          Our bubble tea is crafted with love and the finest ingredients to bring you an authentic 
          Taiwanese tea experience.
        </p>
        <div class="features">
          <div class="feature">
            <span class="icon">🍵</span>
            <span>Premium Quality</span>
          </div>
          <div class="feature">
            <span class="icon">🌿</span>
            <span>Fresh Ingredients</span>
          </div>
          <div class="feature">
            <span class="icon">✨</span>
            <span>Made Fresh Daily</span>
          </div>
        </div>
      </div>
      <div class="image-placeholder">
        <div class="bubble-tea-icon">🧋</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Introduction section component
</script>

<style scoped>
.introduction {
  background: linear-gradient(135deg, #2d8659 0%, #4a9d6e 100%);
  color: white;
  padding: 4rem 2rem;
  min-height: 90vh;
  display: flex;
  align-items: center;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.title {
  font-size: 4rem;
  font-weight: 700;
  margin: 0;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 1.8rem;
  font-weight: 300;
  margin: 0;
  opacity: 0.95;
}

.description {
  font-size: 1.2rem;
  line-height: 1.8;
  margin: 1rem 0;
  opacity: 0.9;
}

.features {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.feature {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.2);
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  backdrop-filter: blur(10px);
}

.feature .icon {
  font-size: 1.5rem;
}

.image-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 4rem;
  backdrop-filter: blur(10px);
}

.bubble-tea-icon {
  font-size: 12rem;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.3));
}

@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .title {
    font-size: 2.5rem;
  }
  
  .subtitle {
    font-size: 1.4rem;
  }
  
  .bubble-tea-icon {
    font-size: 6rem;
  }
}
</style>
