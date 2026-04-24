import { Routes } from '@angular/router';
import { listResolver } from './pages/list/list.resolver';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    },
    {
        path: 'list',
        loadComponent: () => import('./pages/list/list.component').then((m) => m.ListComponent),
        resolve: { listData: listResolver },
    },
];
