import { createCustomElement } from '@angular/elements';
import {
  bootstrapApplication,
  createApplication
} from '@angular/platform-browser';
import { MyButtonComponent } from './components/my-button.component';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
// async () => {
//   const app = await createApplication({
//     providers: [],
//   });

//   const myButton = createCustomElement(MyButtonComponent, {
//     injector: app.injector,
//   });

//   customElements.define('my-button', myButton);
// };
