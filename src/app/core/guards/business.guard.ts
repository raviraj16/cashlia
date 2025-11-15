import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BusinessService } from '../services/business.service';

@Injectable({
  providedIn: 'root'
})
export class BusinessGuard implements CanActivate {
  constructor(
    private businessService: BusinessService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    const businessId = await this.businessService.getCurrentBusinessId();
    
    if (!businessId) {
      this.router.navigate(['/business']);
      return false;
    }

    return true;
  }
}

