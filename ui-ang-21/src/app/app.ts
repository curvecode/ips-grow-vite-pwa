import { CommonModule } from '@angular/common';
import { Component, computed, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CounterComponent } from './counter.component';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, CounterComponent, RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('ui-ang-21');

  // Signal to pass to counter component
  counterInitialValue: WritableSignal<number> = signal(10);
  counterLabel: WritableSignal<string> = signal('My Counter');

  // Example 1: Simple writable signal
  counter: WritableSignal<number> = signal(0);

  // Example 2: String writable signal
  message: WritableSignal<string> = signal('Hello Angular 21!');

  // Example 3: Object writable signal
  user: WritableSignal<{ name: string; age: number }> = signal({
    name: 'John Doe',
    age: 30,
  });

  // Example 4: Computed signal based on writable signals
  doubled = computed(() => this.counter() * 3);

  // Example 5: Array writable signal
  todos: WritableSignal<{ id: number; text: string; completed: boolean }[]> = signal([
    { id: 1, text: 'Learn Signals', completed: true },
    { id: 2, text: 'Build Components', completed: false },
  ]);

  // Methods to modify signals
  increment() {
    this.counter.update((val) => val + 1);
  }

  decrement() {
    this.counter.set(this.counter() - 1);
  }

  updateMessage(newMessage: string) {
    this.message.set(newMessage);
  }

  updateUserName(name: string) {
    this.user.update((user) => ({ ...user, name }));
  }

  addTodo(text: string) {
    this.todos.update((todos) => [...todos, { id: Date.now(), text, completed: false }]);
  }

  toggleTodo(id: number) {
    this.todos.update((todos) =>
      todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)),
    );
  }

  // Update child component signal from parent
  updateChildCounterValue(newValue: number) {
    this.counterInitialValue.set(newValue);
  }

  updateChildCounterLabel(newLabel: string) {
    this.counterLabel.set(newLabel);
  }

  onChildCounterChanged(newValue: number) {
    console.log('Child counter changed to:', newValue);
  }
}
