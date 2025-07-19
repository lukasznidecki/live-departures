import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapComponent } from './components/map/map.component';

interface Todo {
  text: string;
  completed: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MapComponent, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'location-map-app';
  activeTab: 'todo' | 'map' = 'todo';
  newTodo = '';
  todos: Todo[] = [
    { text: 'Haltestelle am Hauptbahnhof finden', completed: false },
    { text: 'Fahrplan prüfen', completed: false },
    { text: 'Ticket kaufen', completed: true }
  ];

  setActiveTab(tab: 'todo' | 'map') {
    this.activeTab = tab;
  }

  addTodo() {
    if (this.newTodo.trim()) {
      this.todos.push({
        text: this.newTodo.trim(),
        completed: false
      });
      this.newTodo = '';
    }
  }
}
