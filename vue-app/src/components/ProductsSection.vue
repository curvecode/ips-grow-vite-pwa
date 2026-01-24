<template>
  <section class="products">
    <div class="container">
      <h2 class="section-title">Our Products</h2>
      <p class="section-subtitle">Choose from our delicious selection of bubble teas</p>
      <div class="products-grid">
        <div 
          v-for="product in products" 
          :key="product.id"
          class="product-card"
        >
          <div class="product-icon">{{ product.icon }}</div>
          <h3 class="product-name">{{ product.name }}</h3>
          <p class="product-description">{{ product.description }}</p>
          <div class="product-price">${{ product.price }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Product {
  id: number
  name: string
  description: string
  price: string
  icon: string
}

const products = ref<Product[]>([
  {
    id: 1,
    name: 'Classic Milk Tea',
    description: 'Traditional black tea with creamy milk and tapioca pearls',
    price: '5.99',
    icon: '🧋'
  },
  {
    id: 2,
    name: 'Taro Milk Tea',
    description: 'Sweet taro flavor blended with fresh milk and pearls',
    price: '6.49',
    icon: '💜'
  },
  {
    id: 3,
    name: 'Matcha Milk Tea',
    description: 'Premium matcha green tea with milk and boba',
    price: '6.99',
    icon: '🍵'
  },
  {
    id: 4,
    name: 'Brown Sugar Milk Tea',
    description: 'Rich brown sugar with fresh milk and chewy pearls',
    price: '6.49',
    icon: '🤎'
  },
  {
    id: 5,
    name: 'Strawberry Milk Tea',
    description: 'Fresh strawberry flavor with creamy milk tea',
    price: '6.99',
    icon: '🍓'
  },
  {
    id: 6,
    name: 'Mango Milk Tea',
    description: 'Tropical mango blended with smooth milk tea',
    price: '6.99',
    icon: '🥭'
  }
])
</script>

<style scoped>
.products {
  background: white;
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

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.product-card {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(45, 134, 89, 0.2);
  border-color: #2d8659;
}

.product-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.product-name {
  font-size: 1.5rem;
  color: #2d8659;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.product-description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.product-price {
  font-size: 1.8rem;
  color: #2d8659;
  font-weight: 700;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
  
  .section-title {
    font-size: 2rem;
  }
}
</style>
