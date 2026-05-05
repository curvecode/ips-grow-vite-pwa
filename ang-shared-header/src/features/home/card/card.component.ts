import { Component, input, OnInit } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent implements OnInit {
  title = input('');
  content = input('');

  ngOnInit(): void {
    console.log('#CardComponent initialized with title:' + this.title());

    // const ProductActions = createActionGroup({
    //   source: 'Products',
    //   events: {
    //     'Load Products': emptyProps(),
    //     'Load Products Success': props<{ products: Product[] }>(),
    //     'Load Products Failure': props<{ error: string }>(),
    //   },
    // });
  }
}
