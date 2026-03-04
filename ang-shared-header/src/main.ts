import { createCustomElement } from '@angular/elements';
import {
  createApplication
} from '@angular/platform-browser';
import { MyButtonComponent } from './components/my-button.component';

// bootstrapApplication(AppComponent, appConfig)
//   .catch((err) => console.error(err));
async () => {
  const app = await createApplication({
    providers: [],
  });

  const myButton = createCustomElement(MyButtonComponent, {
    injector: app.injector,
  });

  customElements.define('my-button', myButton);
};
``
