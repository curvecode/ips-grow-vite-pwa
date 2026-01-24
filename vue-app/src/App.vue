<template>
  <div class="app">
    <!-- Introduction Section -->
    <IntroductionSection />
    
    <!-- Products Section -->
    <ProductsSection />
    
    <!-- Testimonial Section -->
    <TestimonialSection />
    
    <!-- Address Section -->
    <AddressSection />
    
    <!-- Order Dialog Button -->
    <OrderDialog />
  </div>
</template>

<script setup lang="ts">
import IntroductionSection from './components/IntroductionSection.vue'
import ProductsSection from './components/ProductsSection.vue'
import TestimonialSection from './components/TestimonialSection.vue'
import AddressSection from './components/AddressSection.vue'
import OrderDialog from './components/OrderDialog.vue'
</script>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
}
</style>
