import { describe, it, expect, beforeEach } from 'vitest';
import { CacheManager } from '../cache';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = CacheManager.getInstance();
    cacheManager.clear();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const testData = { name: 'test', value: 123 };
      
      cacheManager.set('test-key', testData);
      const retrieved = cacheManager.get('test-key');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheManager.get('non-existent-key');
      
      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      const stringData = 'test string';
      const numberData = 42;
      const arrayData = [1, 2, 3];
      const objectData = { a: 1, b: 2 };
      
      cacheManager.set('string', stringData);
      cacheManager.set('number', numberData);
      cacheManager.set('array', arrayData);
      cacheManager.set('object', objectData);
      
      expect(cacheManager.get('string')).toBe(stringData);
      expect(cacheManager.get('number')).toBe(numberData);
      expect(cacheManager.get('array')).toEqual(arrayData);
      expect(cacheManager.get('object')).toEqual(objectData);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const testData = 'expires soon';
      const shortTTL = 50; // 50ms
      
      cacheManager.set('expiring-key', testData, shortTTL);
      
      // Should be available immediately
      expect(cacheManager.get('expiring-key')).toBe(testData);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired now
      expect(cacheManager.get('expiring-key')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      const testData = 'default ttl';
      
      cacheManager.set('default-ttl-key', testData);
      const retrieved = cacheManager.get('default-ttl-key');
      
      expect(retrieved).toBe(testData);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');
      
      // Verify entries exist
      expect(cacheManager.get('key1')).toBe('value1');
      expect(cacheManager.get('key2')).toBe('value2');
      expect(cacheManager.get('key3')).toBe('value3');
      
      // Clear cache
      cacheManager.clear();
      
      // Verify entries are gone
      expect(cacheManager.get('key1')).toBeNull();
      expect(cacheManager.get('key2')).toBeNull();
      expect(cacheManager.get('key3')).toBeNull();
    });
  });

  describe('cache size management', () => {
    it('should handle multiple entries without issues', () => {
      // Add multiple entries
      for (let i = 0; i < 10; i++) {
        cacheManager.set(`key-${i}`, `value-${i}`);
      }
      
      // Verify all entries are retrievable
      for (let i = 0; i < 10; i++) {
        expect(cacheManager.get(`key-${i}`)).toBe(`value-${i}`);
      }
    });

    it('should overwrite existing keys', () => {
      const key = 'overwrite-test';
      
      cacheManager.set(key, 'original-value');
      expect(cacheManager.get(key)).toBe('original-value');
      
      cacheManager.set(key, 'new-value');
      expect(cacheManager.get(key)).toBe('new-value');
    });
  });
});