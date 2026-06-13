import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private _collapsed = signal<boolean>(false);
  public collapsed = this._collapsed.asReadonly();

  toggleCollapsed() {
    this._collapsed.update(val => !val);
  }

  setCollapsed(val: boolean) {
    this._collapsed.set(val);
  }
}
