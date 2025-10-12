import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from '../../models/user';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})

export class Home implements OnInit, OnDestroy{
  user?: User;
  constructor(private router: Router) {}

  // public user: User ;

  // hoTen: string;
  // email: string;
  // vaiTro: string;
  


  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
  ngOnInit(): void {
    const userInfo = localStorage.getItem('user');
        if (userInfo) {
          this.user = JSON.parse(userInfo);
    } else {
            this.router.navigate(['/login']);
      }
  }
  logout(): void {
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
  goToProfile(): void {
    this.router.navigate(['/profile']);
  }
  
}