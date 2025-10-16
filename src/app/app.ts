import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Header } from '../app/components/header/header';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Header
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  isAuthPage = false;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const hiddenRoutes = ['/login', '/register'];
        this.isAuthPage = hiddenRoutes.includes(event.urlAfterRedirects);
      });
  }
  protected readonly title = signal('a_website_connecting_volunteers_with_events');

}
