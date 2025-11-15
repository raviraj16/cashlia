import { Injectable } from '@angular/core';
import { Firestore, collection, doc, setDoc, getDoc, collectionData, query, where, onSnapshot, Unsubscribe } from '@angular/fire/firestore';
import { EncryptionService } from './encryption.service';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private readonly FIRESTORE_CONFIG_KEY = 'firestore_config';
  private isInitialized = false;

  constructor(
    private firestore: Firestore,
    private encryption: EncryptionService
  ) {}

  /**
   * Initialize Firestore with user's config
   */
  async initialize(userConfig: any): Promise<void> {
    // Store user's Firebase config
    await Preferences.set({
      key: this.FIRESTORE_CONFIG_KEY,
      value: JSON.stringify(userConfig)
    });

    // In production, reinitialize Firebase with user's config
    // For now, assume using the default Firebase config from environment
    this.isInitialized = true;
  }

  /**
   * Check if Firestore is initialized
   */
  async isReady(): Promise<boolean> {
    if (!this.isInitialized) {
      const config = await Preferences.get({ key: this.FIRESTORE_CONFIG_KEY });
      this.isInitialized = !!config.value;
    }
    return this.isInitialized;
  }

  /**
   * Save data to Firestore (encrypted)
   */
  async save(collectionName: string, documentId: string, data: any): Promise<void> {
    if (!await this.isReady()) {
      throw new Error('Firestore not initialized. Please configure your Firebase project.');
    }

    // Encrypt data
    const encrypted = await this.encryption.encrypt(JSON.stringify(data));
    
    // Add metadata
    const documentData = {
      data: encrypted,
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    };

    // Save to Firestore
    const docRef = doc(this.firestore, collectionName, documentId);
    await setDoc(docRef, documentData, { merge: true });
  }

  /**
   * Get data from Firestore (decrypted)
   */
  async get(collectionName: string, documentId: string): Promise<any> {
    if (!await this.isReady()) {
      throw new Error('Firestore not initialized');
    }

    const docRef = doc(this.firestore, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const docData = docSnap.data();
    if (!docData || !docData['data']) {
      return null;
    }

    // Decrypt data
    const decrypted = await this.encryption.decrypt(docData['data']);
    return JSON.parse(decrypted);
  }

  /**
   * Listen to real-time updates
   */
  subscribe(collectionName: string, callback: (data: any[]) => void): Unsubscribe {
    if (!this.isInitialized) {
      throw new Error('Firestore not initialized');
    }

    const collectionRef = collection(this.firestore, collectionName);
    const q = query(collectionRef);

    return onSnapshot(q, async (snapshot) => {
      const results: any[] = [];
      
      for (const docSnap of snapshot.docs) {
        try {
          const docData = docSnap.data();
          if (docData && docData['data']) {
            const decrypted = await this.encryption.decrypt(docData['data']);
            results.push({
              id: docSnap.id,
              ...JSON.parse(decrypted)
            });
          }
        } catch (error) {
          console.error(`Error decrypting document ${docSnap.id}:`, error);
        }
      }

      callback(results);
    });
  }

  /**
   * Batch save multiple documents
   */
  async batchSave(collectionName: string, documents: Array<{ id: string; data: any }>): Promise<void> {
    if (!await this.isReady()) {
      throw new Error('Firestore not initialized');
    }

    const promises = documents.map(async (doc) => {
      await this.save(collectionName, doc.id, doc.data);
    });

    await Promise.all(promises);
  }

  /**
   * Delete document
   */
  async delete(collectionName: string, documentId: string): Promise<void> {
    if (!await this.isReady()) {
      throw new Error('Firestore not initialized');
    }

    const docRef = doc(this.firestore, collectionName, documentId);
    await setDoc(docRef, { deleted: true, deleted_at: new Date().toISOString() }, { merge: true });
  }
}

