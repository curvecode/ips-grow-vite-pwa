import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { debounce, form, FormField, required } from '@angular/forms/signals';

@Component({
  selector: 'app-signal-form',
  imports: [FormField, CommonModule],
  templateUrl: './signal-form.html',
  styleUrl: './signal-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalForm {
  loginModel = signal({
    email: '',
    password: '',
  });

  loginForm = form(this.loginModel, (schema) => {
    debounce(schema.email, 500);
    required(schema.email);
    required(schema.password);
  });

  onSubmit() {
    console.log('Form Submitted:', this.loginModel());
  }
}
