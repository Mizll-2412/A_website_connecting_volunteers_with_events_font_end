import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Home } from './components/home/home';
import { RegisterComponent } from './components/register/register';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { ResetPassword } from './components/reset-password/reset-password';
import { VolunteerProfileComponent } from './components/volunteer-profile/volunteer-profile';
import { EventManagementComponent } from './components/event-management/event-management';
import { EventHistory } from './components/event-history/event-history';
import { Notifications } from './components/notifications/notifications';
import { Reputation } from './components/reputation/reputation';
import { EventRecommendations } from './components/event-recommendations/event-recommendations';
import { Statistics } from './components/statistics/statistics';
import { OrganizationStatistics } from './components/organization-statistics/organization-statistics';
import { OrganizationEvaluations } from './components/organization-evaluations/organization-evaluations';
import { CertificateComponent } from './components/certificate/certificate';
import { AdvancedSearchComponent } from './components/advanced-search/advanced-search';
import { AdminComponent } from './components/admin/admin';
import { AdminDashboard } from './components/admin/admin-dashboard/admin-dashboard';
import { UserManagement } from './components/admin/user-management/user-management';
import { OrganizationVerification as AdminOrganizationVerification } from './components/admin/organization-verification/organization-verification';
import { OrganizationVerification } from './components/organization-verification/organization-verification';
import { OrganizationProfileComponent } from './components/organization-profile/organization-profile';
import { ToChucComponent } from './components/admin/organization/organization';
import { SuKienComponent } from './components/admin/event/event';
import { TinhNguyenVienComponent } from './components/admin/volunteer/volunteer';
import { SkillManagement } from './components/admin/skill-management/skill-management';
import { FieldManagement } from './components/admin/field-management/field-management';
import { AdminEvaluationsComponent } from './components/admin/evaluations/admin-evaluations';
import { EventRegisteredComponent } from './components/events/events';
import { EventDetailComponent } from './components/event-detail/event-detail';
import { RegistrationListComponent } from './components/registration-list/registration-list';
import { ToChucListComponent } from './components/organization/organization';
import { FeaturedProfilesComponent } from './components/featured-profiles/featured-profiles';
import { ExploreComponent } from './components/explore/explore';
import { EventsOrganizationsComponent } from './components/events-organizations/events-organizations';
import { Layout } from './components/layout/layout';
import { AccountSettingsComponent } from './components/account-settings/account-settings';
import { OrganizationDetailComponent } from './components/organization-detail/organization-detail';
import { OrganizationEventDetailComponent } from './components/organization-event-detail/organization-event-detail';
import { CertificateTemplateEditorComponent } from './components/certificate-template-editor/certificate-template-editor';
import { CertificateViewerComponent } from './components/certificate-viewer/certificate-viewer';
import { ConfirmChangeEmailComponent } from './components/confirm-change-email/confirm-change-email';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'reset-password', component: ResetPassword },
  { path: 'confirm-change-email', component: ConfirmChangeEmailComponent },
  {
    path: '',
    component: Layout,
    children: [
      { path: 'home', component: Home },
      { path: 'profile', component: VolunteerProfileComponent },
      { path: 'account-settings', component: AccountSettingsComponent },
      { path: 'event-history', component: EventHistory },
      { path: 'notifications', component: Notifications },
      { path: 'reputation', component: Reputation },
      { path: 'recommendations', component: EventRecommendations },
      { path: 'statistics', component: Statistics },
      { path: 'org-statistics', component: OrganizationStatistics },
      { path: 'org-evaluations', component: OrganizationEvaluations },
      { path: 'certificates', component: CertificateComponent },
      { path: 'explore', component: EventsOrganizationsComponent }, // Trang mới gộp
      { path: 'org-profile', component: OrganizationProfileComponent },
      { path: 'manage-org', component: EventManagementComponent },
      { path: 'manage-org/:id', component: OrganizationEventDetailComponent },
      { path: 'certificate-editor/:id', component: CertificateTemplateEditorComponent },
      { path: 'certificate-view/:id', component: CertificateViewerComponent },
      { path: 'verify-org', component: OrganizationVerification },
      { path: 'su-kien/:id', component: EventDetailComponent },
      { path: 'to-chuc/:id', component: OrganizationDetailComponent },
      { path: 'dang-ky', component: RegistrationListComponent },
      { path: 'list-user', component: FeaturedProfilesComponent },
      
      // Legacy routes - redirect to new page
      { path: 'search', redirectTo: 'explore', pathMatch: 'full' },
      { path: 'su-kien', redirectTo: 'explore', pathMatch: 'full' },
      { path: 'organization', redirectTo: 'explore', pathMatch: 'full' },
      
      {
        path: 'admin',
        component: AdminComponent,
        children: [
          { path: 'dashboard', component: Statistics },
          { path: 'users', component: UserManagement },
          { path: 'verify-organizations', component: AdminOrganizationVerification },
          { path: 'evaluations', component: AdminEvaluationsComponent },
          { path: 'tochuc', component: ToChucComponent },
          { path: 'sukien', component: SuKienComponent },
          { path: 'tinhnguyenvien', component: TinhNguyenVienComponent },
          { path: 'skills', component: SkillManagement },
          { path: 'fields', component: FieldManagement },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
      },
      
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },
  
  { path: '**', redirectTo: 'home' }
];