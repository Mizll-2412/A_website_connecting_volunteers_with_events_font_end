import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Home } from './components/home/home';
import { RegisterComponent } from './components/register/register';
import { VolunteerProfileComponent } from './components/volunteer-profile/volunteer-profile';
import { EventManagementComponent } from './components/event-management/event-management';
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: Home},
  { path: 'profile', component: VolunteerProfileComponent },
  { path: 'manage-org', component: EventManagementComponent }
];