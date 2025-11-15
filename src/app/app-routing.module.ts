import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./features/auth/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./features/auth/forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule)
  },
  {
    path: 'app-lock',
    loadChildren: () => import('./features/app-lock/app-lock.module').then(m => m.AppLockPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'business',
    loadChildren: () => import('./features/business/list/business-list.module').then(m => m.BusinessListPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'business/create',
    loadChildren: () => import('./features/business/create-edit/business-create-edit.module').then(m => m.BusinessCreateEditPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'business/edit/:id',
    loadChildren: () => import('./features/business/create-edit/business-create-edit.module').then(m => m.BusinessCreateEditPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'business/team/:id',
    loadChildren: () => import('./features/business/team-management/team-management.module').then(m => m.TeamManagementPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'business/invite/:id',
    loadChildren: () => import('./features/business/invite/business-invite.module').then(m => m.BusinessInvitePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'books',
    loadChildren: () => import('./features/books/list/book-list.module').then(m => m.BookListPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'books/create',
    loadChildren: () => import('./features/books/create-edit/book-create-edit.module').then(m => m.BookCreateEditPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'books/edit/:id',
    loadChildren: () => import('./features/books/create-edit/book-create-edit.module').then(m => m.BookCreateEditPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'entries',
    loadChildren: () => import('./features/entries/list/entry-list.module').then(m => m.EntryListPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'entries/list',
    loadChildren: () => import('./features/entries/list/entry-list.module').then(m => m.EntryListPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'entries/create',
    loadChildren: () => import('./features/entries/create-edit/entry-create-edit.module').then(m => m.EntryCreateEditPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'entries/edit/:id',
    loadChildren: () => import('./features/entries/create-edit/entry-create-edit.module').then(m => m.EntryCreateEditPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'entries/detail/:id',
    loadChildren: () => import('./features/entries/detail/entry-detail.module').then(m => m.EntryDetailPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'entries/filters',
    loadChildren: () => import('./features/entries/filters/entry-filters.module').then(m => m.EntryFiltersPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'parties',
    loadChildren: () => import('./features/parties/crud/party-crud.module').then(m => m.PartyCrudPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'categories',
    loadChildren: () => import('./features/categories/crud/category-crud.module').then(m => m.CategoryCrudPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports',
    loadChildren: () => import('./features/reports/generator/report-generator.module').then(m => m.ReportGeneratorPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'reports/generator',
    loadChildren: () => import('./features/reports/generator/report-generator.module').then(m => m.ReportGeneratorPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings/sync',
    loadChildren: () => import('./features/settings/sync/sync-settings.module').then(m => m.SyncSettingsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings/security',
    loadChildren: () => import('./features/settings/security/security-settings.module').then(m => m.SecuritySettingsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings/profile',
    loadChildren: () => import('./features/settings/profile/profile-settings.module').then(m => m.ProfileSettingsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
