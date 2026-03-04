// my-button.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'my-button',
  standalone: true,
  imports: [CommonModule],
  template: `<button>{{ label }}</button>`,
})
export class MyButtonComponent {
  @Input() label = 'Click me';
}
