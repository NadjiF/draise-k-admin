import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Le bouton de déconnexion n'apparaît que si un jeton est gardé.
  // computed suit le signal jeton : le bouton disparaît dès la déconnexion, sans autre code.
  protected readonly connecte = computed(() => this.auth.jeton() !== null);

  protected seDeconnecter(): void {
    this.auth.deconnexion();
    void this.router.navigateByUrl('/connexion');
  }
}
