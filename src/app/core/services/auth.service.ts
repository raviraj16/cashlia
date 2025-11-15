import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { DatabaseService } from './database.service';
import { EncryptionService } from './encryption.service';
import { User } from '../models/user.model';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCredential, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, User as FirebaseUser } from '@angular/fire/auth';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SESSION_KEY = 'user_session';
  private currentUser: User | null = null;

  constructor(
    private db: DatabaseService,
    private encryption: EncryptionService,
    private firebaseAuth: Auth
  ) {
    // Handle redirect result for Google Sign-In
    this.handleRedirectResult();
  }

  /**
   * Handle redirect result from Google Sign-In
   */
  private async handleRedirectResult(): Promise<void> {
    try {
      const result = await getRedirectResult(this.firebaseAuth);
      if (result && result.user) {
        await this.loginWithFirebase(result.user);
      }
    } catch (error) {
      console.error('Error handling redirect result:', error);
    }
  }

  /**
   * Register user with email/mobile and password
   */
  async register(email: string, mobile: string, password: string): Promise<User> {
    // Check if user already exists
    const existingUser = await this.db.query(
      'SELECT * FROM users WHERE email = ? OR mobile = ?',
      [email, mobile]
    );

    if (existingUser.length > 0) {
      throw new Error('User with this email or mobile already exists');
    }

    // Hash password
    const passwordHash = this.encryption.hashPassword(password);

    // Create user
    const userId = this.db.generateUUID();
    const now = this.db.getCurrentTimestamp();

    const user: User = {
      id: userId,
      email,
      mobile,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now
    };

    await this.db.execute(
      'INSERT INTO users (id, email, mobile, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, user.email, user.mobile, user.password_hash, user.created_at, user.updated_at]
    );

    // Clear any previous business/book selections (in case of localStorage persistence)
    // This ensures new users don't see data from previous user sessions
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key: 'current_business_id' });
    await Preferences.remove({ key: 'current_book_id' });

    // Store session
    await this.setSession(user);

    return user;
  }

  /**
   * Login with email/mobile and password
   */
  async login(emailOrMobile: string, password: string): Promise<User> {
    // Find user by email or mobile
    const users = await this.db.query(
      'SELECT * FROM users WHERE email = ? OR mobile = ?',
      [emailOrMobile, emailOrMobile]
    );

    if (users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0] as User;

    // Verify password
    if (!user.password_hash || !this.encryption.verifyPassword(password, user.password_hash)) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.updated_at = this.db.getCurrentTimestamp();
    await this.db.execute(
      'UPDATE users SET updated_at = ? WHERE id = ?',
      [user.updated_at, user.id]
    );

    // Store session
    await this.setSession(user);

    return user;
  }

  /**
   * Login with Firebase (Google Sign-In)
   */
  async loginWithFirebase(firebaseUser: FirebaseUser): Promise<User> {
    // Check if user exists with Firebase UID
    let users = await this.db.query(
      'SELECT * FROM users WHERE firebase_uid = ?',
      [firebaseUser.uid]
    );

    let user: User;

    if (users.length > 0) {
      // Update existing user
      user = users[0] as User;
      user.updated_at = this.db.getCurrentTimestamp();
      await this.db.execute(
        'UPDATE users SET email = ?, updated_at = ? WHERE id = ?',
        [firebaseUser.email || user.email, user.updated_at, user.id]
      );
    } else {
      // Check if user exists with email
      users = await this.db.query(
        'SELECT * FROM users WHERE email = ?',
        [firebaseUser.email]
      );

      if (users.length > 0) {
        // Link Firebase account to existing user
        user = users[0] as User;
        user.firebase_uid = firebaseUser.uid;
        user.updated_at = this.db.getCurrentTimestamp();
        await this.db.execute(
          'UPDATE users SET firebase_uid = ?, updated_at = ? WHERE id = ?',
          [user.firebase_uid, user.updated_at, user.id]
        );
      } else {
        // Create new user
        const userId = this.db.generateUUID();
        const now = this.db.getCurrentTimestamp();

        user = {
          id: userId,
          email: firebaseUser.email || '',
          firebase_uid: firebaseUser.uid,
          created_at: now,
          updated_at: now
        };

        await this.db.execute(
          'INSERT INTO users (id, email, firebase_uid, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
          [user.id, user.email, user.firebase_uid, user.created_at, user.updated_at]
        );
      }
    }

    // Store session
    await this.setSession(user);

    return user;
  }

  /**
   * Google Sign-In using Firebase Auth
   */
  async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      // Use signInWithPopup for web, or signInWithRedirect for mobile
      const result = await signInWithPopup(this.firebaseAuth, provider);
      return await this.loginWithFirebase(result.user);
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      // If popup fails, try redirect (for mobile)
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(this.firebaseAuth, provider);
          // User will be redirected, so return null for now
          // The redirect will be handled by getRedirectResult
          return null as any;
        } catch (redirectError) {
          throw new Error('Google Sign-In failed. Please try again.');
        }
      }
      throw error;
    }
  }

  /**
   * Set user session
   */
  private async setSession(user: User): Promise<void> {
    this.currentUser = user;
    await Preferences.set({
      key: this.SESSION_KEY,
      value: JSON.stringify(user)
    });
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const session = await Preferences.get({ key: this.SESSION_KEY });
    if (session.value) {
      this.currentUser = JSON.parse(session.value) as User;
      return this.currentUser;
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    this.currentUser = null;
    await Preferences.remove({ key: this.SESSION_KEY });
    
    // Clear business and book selections on logout
    // This prevents data leakage between user sessions
    await Preferences.remove({ key: 'current_business_id' });
    await Preferences.remove({ key: 'current_book_id' });
    
    // Sign out from Firebase if logged in
    try {
      if (this.firebaseAuth.currentUser) {
        await this.firebaseAuth.signOut();
      }
    } catch (error) {
      console.error('Firebase sign out error:', error);
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<User>): Promise<void> {
    const now = this.db.getCurrentTimestamp();
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.mobile !== undefined) {
      fields.push('mobile = ?');
      values.push(updates.mobile);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(userId);

    await this.db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Update session
    const user = await this.getCurrentUser();
    if (user && user.id === userId) {
      Object.assign(user, updates, { updated_at: now });
      await this.setSession(user);
    }
  }
}

