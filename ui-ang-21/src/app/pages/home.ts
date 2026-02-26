import { CommonModule } from '@angular/common';
import { Component, computed, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CounterComponent } from '../counter.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, CounterComponent],
  templateUrl: './home.html',
  standalone: true,
})
export class Home {
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
    age: 30
  });

  // Example 4: Computed signal based on writable signals
  doubled = computed(() => this.counter() * 3);

  // Example 5: Array writable signal
  todos: WritableSignal<{ id: number; text: string; completed: boolean }[]> = signal([
    { id: 1, text: 'Learn Signals', completed: true },
    { id: 2, text: 'Build Components', completed: false }
  ]);

  // Methods to modify signals
  increment() {
    this.counter.update(val => val + 1);
  }

  decrement() {
    this.counter.set(this.counter() - 1);
  }

  updateMessage(newMessage: string) {
    this.message.set(newMessage);
  }

  updateUsername(newName: string) {
    this.user.update(currentUser => ({
      ...currentUser,
      name: newName
    }));
  }

  updateUserAge(newAge: number) {
    this.user.update(currentUser => ({
      ...currentUser,
      age: newAge
    }));
  }

  addTodo(text: string) {
    const newId = Math.max(...this.todos().map(t => t.id), 0) + 1;
    this.todos.update(currentTodos => [
      ...currentTodos,
      { id: newId, text, completed: false }
    ]);
  }

  toggleTodo(id: number) {
    this.todos.update(currentTodos =>
      currentTodos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  deleteTodo(id: number) {
    this.todos.update(currentTodos =>
      currentTodos.filter(todo => todo.id !== id)
    );
  }

  updateChildCounterValue(value: number) {
    this.counterInitialValue.set(value);
  }

  updateChildCounterLabel(label: string) {
    this.counterLabel.set(label);
  }

  onChildCounterChanged(newCount: number) {
    console.log('Counter changed in child component:', newCount);
  }
}
