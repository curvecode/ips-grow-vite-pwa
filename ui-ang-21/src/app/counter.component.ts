import { Component, input, output, WritableSignal, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-counter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 15px; border: 2px solid #007bff; border-radius: 5px; margin: 10px 0;">
      <h3>Counter Component</h3>
      <p>Label: <strong>{{ label() }}</strong></p>
      <p>Current Count: <strong>{{ localCount() }}</strong></p>
      <p>Triple Count: <strong>{{ tripleCount() }}</strong></p>
      
      <div style="margin-top: 10px;">
        <button (click)="incrementLocal()" style="padding: 8px 16px; margin-right: 5px;">
          Increment Local
        </button>
        <button (click)="decrementLocal()" style="padding: 8px 16px; margin-right: 5px;">
          Decrement Local
        </button>
        <button (click)="resetLocal()" style="padding: 8px 16px; background: #dc3545; color: white;">
          Reset
        </button>
      </div>

      <p style="color: #666; font-size: 12px; margin-top: 10px;">
        This component has its own local signal that can be updated from parent via input
      </p>
    </div>
  `,
  styles: []
})
export class CounterComponent {
  // Input signal - receives initial value from parent
  label = input('Counter');
  initialValue = input(0);

  // Local writable signal - initialized from input
  localCount: WritableSignal<number> = signal(0);

  // Computed signal based on local count
  tripleCount = computed(() => this.localCount() * 3);

  constructor() {
    // Initialize local count from input when component loads
    this.localCount.set(this.initialValue());
  }

  // Output event to notify parent of changes
  countChanged = output<number>();

  incrementLocal() {
    this.localCount.update(val => val + 1);
    this.countChanged.emit(this.localCount());
  }

  decrementLocal() {
    this.localCount.update(val => val - 1);
    this.countChanged.emit(this.localCount());
  }

  resetLocal() {
    this.localCount.set(this.initialValue());
    this.countChanged.emit(this.localCount());
  }

  // Method to update from parent
  updateCount(newValue: number) {
    this.localCount.set(newValue);
    this.countChanged.emit(newValue);
  }
}
