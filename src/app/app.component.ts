import { Component, OnInit } from '@angular/core';
import { Platform, MenuController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { DatabaseService } from './core/services/database.service';
import { BusinessService } from './core/services/business.service';
import { BookService } from './core/services/book.service';
import { SyncService } from './core/services/sync.service';
import { DeepLinkService } from './core/services/deep-link.service';
import { AppLockService } from './core/services/app-lock.service';
import { Business } from './core/models/business.model';
import { Book } from './core/models/book.model';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  currentBusiness: Business | null = null;
  currentBook: Book | null = null;

  constructor(
    private platform: Platform,
    private databaseService: DatabaseService,
    private businessService: BusinessService,
    private bookService: BookService,
    private syncService: SyncService,
    private deepLinkService: DeepLinkService,
    private appLockService: AppLockService,
    private menuController: MenuController
  ) {}

  async ngOnInit() {
    await this.platform.ready();
    
    // Initialize database
    try {
      await this.databaseService.initializeDatabase();
      console.log('Database initialized successfully');
      
      // Load current business and book
      await this.loadCurrentContext();
      
      // Setup app state listeners
      this.setupAppStateListeners();
      
      // Check if app should be locked
      if (await this.appLockService.shouldLock()) {
        await this.appLockService.lockApp();
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  async loadCurrentContext() {
    try {
      this.currentBusiness = await this.businessService.getCurrentBusiness();
      this.currentBook = await this.bookService.getCurrentBook();
    } catch (error) {
      console.error('Error loading current context:', error);
    }
  }

  async openMenu() {
    await this.menuController.open('main-menu');
  }

  /**
   * Setup app state listeners for background sync
   */
  private setupAppStateListeners() {
    // Sync on app resume
    App.addListener('appStateChange', async (state: { isActive: boolean }) => {
      if (state.isActive) {
        // App came to foreground
        try {
          const syncMethod = await this.syncService.getSyncMethod();
          if (syncMethod !== 'none') {
            // Background sync
            this.syncService.syncAll().catch(error => {
              console.error('Background sync error:', error);
            });
          }
        } catch (error) {
          console.error('Error during background sync:', error);
        }
      }
    });
  }
}
