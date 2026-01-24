<template>
  <div>
    <!-- Floating Order Button -->
    <button 
      class="order-button"
      @click="openDialog"
      aria-label="Open order dialog"
    >
      <span class="button-icon">🛒</span>
      <span class="button-text">Order Now</span>
    </button>

    <!-- Order Dialog Modal -->
    <div 
      v-if="isOpen" 
      class="modal-overlay"
      @click="closeDialog"
    >
      <div 
        class="modal-content"
        @click.stop
      >
        <button 
          class="close-button"
          @click="closeDialog"
          aria-label="Close dialog"
        >
          ×
        </button>
        
        <h2 class="modal-title">Place Your Order</h2>
        
        <div class="order-form">
          <div class="form-group">
            <label for="product">Select Product</label>
            <select id="product" v-model="selectedProduct" class="form-input">
              <option value="">Choose a product...</option>
              <option 
                v-for="product in products" 
                :key="product.id"
                :value="product.id"
              >
                {{ product.name }} - ${{ product.price }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="quantity">Quantity</label>
            <input 
              id="quantity"
              type="number" 
              v-model.number="quantity" 
              min="1" 
              max="10"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="name">Your Name</label>
            <input 
              id="name"
              type="text" 
              v-model="customerName" 
              placeholder="Enter your name"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="phone">Phone Number</label>
            <input 
              id="phone"
              type="tel" 
              v-model="phoneNumber" 
              placeholder="Enter your phone"
              class="form-input"
            />
          </div>

          <div class="order-summary" v-if="selectedProduct">
            <h3>Order Summary</h3>
            <div class="summary-item">
              <span>Product:</span>
              <span>{{ getProductName() }}</span>
            </div>
            <div class="summary-item">
              <span>Quantity:</span>
              <span>{{ quantity }}</span>
            </div>
            <div class="summary-item total">
              <span>Total:</span>
              <span>${{ calculateTotal() }}</span>
            </div>
          </div>

          <button 
            class="submit-button"
            @click="submitOrder"
            :disabled="!canSubmit"
          >
            Submit Order
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Product {
  id: number
  name: string
  price: string
}

const isOpen = ref<boolean>(false)
const selectedProduct = ref<number | ''>('')
const quantity = ref<number>(1)
const customerName = ref<string>('')
const phoneNumber = ref<string>('')

const products: Product[] = [
  { id: 1, name: 'Classic Milk Tea', price: '5.99' },
  { id: 2, name: 'Taro Milk Tea', price: '6.49' },
  { id: 3, name: 'Matcha Milk Tea', price: '6.99' },
  { id: 4, name: 'Brown Sugar Milk Tea', price: '6.49' },
  { id: 5, name: 'Strawberry Milk Tea', price: '6.99' },
  { id: 6, name: 'Mango Milk Tea', price: '6.99' }
]

const canSubmit = computed(() => {
  return selectedProduct.value !== '' && 
         quantity.value > 0 && 
         customerName.value.trim() !== '' && 
         phoneNumber.value.trim() !== ''
})

const openDialog = (): void => {
  isOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeDialog = (): void => {
  isOpen.value = false
  document.body.style.overflow = ''
}

const getProductName = (): string => {
  const product = products.find(p => p.id === selectedProduct.value)
  return product ? product.name : ''
}

const calculateTotal = (): string => {
  if (!selectedProduct.value) return '0.00'
  const product = products.find(p => p.id === selectedProduct.value)
  if (!product) return '0.00'
  const total = parseFloat(product.price) * quantity.value
  return total.toFixed(2)
}

const submitOrder = (): void => {
  if (!canSubmit.value) return
  
  alert(`Order submitted!\n\n${getProductName()}\nQuantity: ${quantity.value}\nTotal: $${calculateTotal()}\n\nWe'll contact you at ${phoneNumber.value} soon!`)
  
  // Reset form
  selectedProduct.value = ''
  quantity.value = 1
  customerName.value = ''
  phoneNumber.value = ''
  closeDialog()
}
</script>

<style scoped>
.order-button {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #2d8659;
  color: white;
  border: none;
  border-radius: 50px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(45, 134, 89, 0.4);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 1000;
  transition: all 0.3s ease;
}

.order-button:hover {
  background: #25694a;
  transform: scale(1.05);
  box-shadow: 0 6px 25px rgba(45, 134, 89, 0.5);
}

.button-icon {
  font-size: 1.5rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 2rem;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: #e0e0e0;
  color: #333;
}

.modal-title {
  color: #2d8659;
  font-size: 2rem;
  margin-bottom: 2rem;
  text-align: center;
  font-weight: 700;
}

.order-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: #333;
  font-weight: 600;
  font-size: 0.95rem;
}

.form-input {
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #2d8659;
}

.order-summary {
  background: #f0f8f4;
  padding: 1.5rem;
  border-radius: 12px;
  margin-top: 0.5rem;
}

.order-summary h3 {
  color: #2d8659;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  color: #333;
}

.summary-item.total {
  font-weight: 700;
  font-size: 1.2rem;
  color: #2d8659;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 2px solid #2d8659;
}

.submit-button {
  background: #2d8659;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.3s ease;
}

.submit-button:hover:not(:disabled) {
  background: #25694a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 134, 89, 0.3);
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .order-button {
    bottom: 1rem;
    right: 1rem;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
  
  .button-text {
    display: none;
  }
  
  .modal-content {
    padding: 1.5rem;
    margin: 1rem;
  }
}
</style>
