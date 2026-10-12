import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboardPage.component';
import { SettingsComponent } from './pages/settings/settingsPage.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'settings', component: SettingsComponent },
];
