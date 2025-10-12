import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { AuthService, LoginRequest } from '../../services/auth';

@Component({
  imports: [
    CommonModule, 
    FormsModule,  
    RouterModule
  ],
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  loginData: LoginRequest = {
    email: '',
    password: ''
  };

  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = response.message;
          this.authService.saveToken(response.token!);
          this.authService.saveUser(response.userInfo);
          this.router.navigate(['/home']);

          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        } else {
          this.errorMessage = response.message;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Lỗi kết nối đến server';
        this.isLoading = false;
      }
    });
  }
}