import { Component, OnInit, signal } from '@angular/core';
import { CardComponent } from '../card/card.component';

@Component({
  selector: 'app-home',
  imports: [CardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  listSignal = signal([
    { title: 'Card 1', content: 'Content for card 1' },
    { title: 'Card 2', content: 'Content for card 2' },
    { title: 'Card 3', content: 'Content for card 3' },
  ]);

  listNormal = [
    { title: 'Card 4', content: 'Content for card 4' },
    { title: 'Card 5', content: 'Content for card 5' },
    { title: 'Card 6', content: 'Content for card 6' },
  ];
  ngOnInit(): void {
    console.log('#HomeComponent initialized');
  }

  editCard2() {
    this.listSignal.update((items) => {
      const newItems = [...items];
      newItems[1] = {
        title: 'Updated Card 2',
        content: 'Updated content for card 2',
      };
      return newItems;
    });
  }

  editCard5Normal() {
    this.listNormal = this.listNormal.map((item, index) => {
      if (index === 1) {
        return {
          title: 'Updated Card 5',
          content: 'Updated content for card 5',
        };
      }
      return item;
    });
    // this.listNormal[1] = {
    //   title: 'Updated Card 5',
    //   content: 'Updated content for card 5',
    // };
  }
}
