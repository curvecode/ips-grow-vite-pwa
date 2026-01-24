<template>
  <section class="testimonials">
    <div class="container">
      <h2 class="section-title">What Our Customers Say</h2>
      <p class="section-subtitle">Real reviews from bubble tea lovers</p>
      <div class="testimonials-grid">
        <div 
          v-for="testimonial in testimonials" 
          :key="testimonial.id"
          class="testimonial-card"
        >
          <div class="stars">{{ testimonial.rating }}</div>
          <p class="testimonial-text">"{{ testimonial.text }}"</p>
          <div class="testimonial-author">
            <div class="author-avatar">{{ testimonial.avatar }}</div>
            <div class="author-info">
              <div class="author-name">{{ testimonial.name }}</div>
              <div class="author-role">{{ testimonial.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Testimonial {
  id: number
  name: string
  role: string
  text: string
  rating: string
  avatar: string
}

const testimonials = ref<Testimonial[]>([
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Regular Customer',
    text: 'The best bubble tea I\'ve ever had! The pearls are perfectly chewy and the tea is so fresh. I come here every week!',
    rating: '⭐⭐⭐⭐⭐',
    avatar: '👩'
  },
  {
    id: 2,
    name: 'Mike Johnson',
    role: 'Tea Enthusiast',
    text: 'Authentic Taiwanese bubble tea experience. The matcha milk tea is absolutely divine. Highly recommended!',
    rating: '⭐⭐⭐⭐⭐',
    avatar: '👨'
  },
  {
    id: 3,
    name: 'Emily Wang',
    role: 'Food Blogger',
    text: 'Simple Milktea never disappoints! Their taro flavor is incredible and the service is always friendly. Love this place!',
    rating: '⭐⭐⭐⭐⭐',
    avatar: '👩‍🦰'
  }
])
</script>

<style scoped>
.testimonials {
  background: linear-gradient(135deg, #f0f8f4 0%, #e8f5e9 100%);
  padding: 5rem 2rem;
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 3rem;
  color: #2d8659;
  text-align: center;
  margin-bottom: 1rem;
  font-weight: 700;
}

.section-subtitle {
  text-align: center;
  color: #666;
  font-size: 1.2rem;
  margin-bottom: 3rem;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.testimonial-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(45, 134, 89, 0.1);
  transition: transform 0.3s ease;
}

.testimonial-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(45, 134, 89, 0.15);
}

.stars {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #ffc107;
}

.testimonial-text {
  color: #333;
  line-height: 1.8;
  font-size: 1.05rem;
  margin-bottom: 1.5rem;
  font-style: italic;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.author-avatar {
  font-size: 3rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f8f4;
  border-radius: 50%;
}

.author-info {
  flex: 1;
}

.author-name {
  font-weight: 600;
  color: #2d8659;
  font-size: 1.1rem;
}

.author-role {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.25rem;
}

@media (max-width: 768px) {
  .testimonials-grid {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 2rem;
  }
}
</style>
