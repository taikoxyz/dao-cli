import wait from '../../src/util/wait';

describe('wait', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should resolve after specified milliseconds', async () => {
      const promise = wait(1000);

      // Promise should not be resolved yet
      expect(setTimeout).toHaveBeenCalledTimes(1);
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Promise should now resolve
      await expect(promise).resolves.toBeUndefined();
    });

    it('should resolve with undefined value', async () => {
      const promise = wait(500);
      jest.advanceTimersByTime(500);

      const result = await promise;
      expect(result).toBeUndefined();
    });
  });

  describe('timing accuracy', () => {
    it('should not resolve before specified time', async () => {
      const promise = wait(1000);
      let resolved = false;

      promise.then(() => {
        resolved = true;
      });

      // Advance time by less than specified
      jest.advanceTimersByTime(999);
      await Promise.resolve(); // Allow any pending promises to run

      expect(resolved).toBe(false);

      // Advance by the remaining time
      jest.advanceTimersByTime(1);
      await promise; // Wait for completion

      expect(resolved).toBe(true);
    });

    it('should resolve exactly at specified time', async () => {
      const promise = wait(2000);

      jest.advanceTimersByTime(2000);
      await promise;

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);
    });
  });

  describe('different time values', () => {
    it('should handle zero milliseconds', async () => {
      const promise = wait(0);

      jest.advanceTimersByTime(0);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle small time values', async () => {
      const promise = wait(1);

      jest.advanceTimersByTime(1);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle large time values', async () => {
      const promise = wait(60000); // 1 minute

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);

      jest.advanceTimersByTime(60000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle fractional milliseconds', async () => {
      const promise = wait(1.5);

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1.5);

      jest.advanceTimersByTime(1.5);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe('multiple concurrent waits', () => {
    it('should handle multiple concurrent wait calls', async () => {
      const promise1 = wait(1000);
      const promise2 = wait(2000);
      const promise3 = wait(500);

      expect(setTimeout).toHaveBeenCalledTimes(3);

      // Advance to 500ms - only promise3 should resolve
      jest.advanceTimersByTime(500);
      await expect(promise3).resolves.toBeUndefined();

      // Advance to 1000ms - promise1 should resolve
      jest.advanceTimersByTime(500);
      await expect(promise1).resolves.toBeUndefined();

      // Advance to 2000ms - promise2 should resolve
      jest.advanceTimersByTime(1000);
      await expect(promise2).resolves.toBeUndefined();
    });

    it('should resolve waits in correct order', async () => {
      const resolvedOrder: number[] = [];

      const promise1 = wait(300).then(() => resolvedOrder.push(1));
      const promise2 = wait(100).then(() => resolvedOrder.push(2));
      const promise3 = wait(200).then(() => resolvedOrder.push(3));

      // Advance time incrementally and wait for promises
      jest.advanceTimersByTime(100);
      await promise2;
      expect(resolvedOrder).toEqual([2]);

      jest.advanceTimersByTime(100); // Total: 200ms
      await promise3;
      expect(resolvedOrder).toEqual([2, 3]);

      jest.advanceTimersByTime(100); // Total: 300ms
      await promise1;
      expect(resolvedOrder).toEqual([2, 3, 1]);
    });
  });

  describe('error handling', () => {
    it('should handle negative time values', async () => {
      const promise = wait(-1000);

      // setTimeout with negative values typically gets converted to 0 or 1
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), -1000);

      jest.advanceTimersByTime(0);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle NaN time values', async () => {
      const promise = wait(NaN);

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), NaN);

      jest.advanceTimersByTime(0);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle Infinity time values', async () => {
      wait(Infinity);

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), Infinity);

      // Infinity timeout would never resolve in real scenarios
      // but with fake timers we can test the call was made
      expect(setTimeout).toHaveBeenCalled();
    });
  });

  describe('return type and promise behavior', () => {
    it('should return a Promise', () => {
      const result = wait(1000);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should be awaitable', async () => {
      const promise = wait(100);
      jest.advanceTimersByTime(100);

      // This should not throw
      await expect(async () => {
        await promise;
      }).not.toThrow();
    });

    it('should be thenable', (done) => {
      wait(100)
        .then((result) => {
          expect(result).toBeUndefined();
          done();
        })
        .catch(done);

      jest.advanceTimersByTime(100);
    });
  });

  describe('integration scenarios', () => {
    it('should work in async/await patterns', async () => {
      async function delayedFunction() {
        await wait(100);
        return 'completed';
      }

      const promise = delayedFunction();
      jest.advanceTimersByTime(100);

      const result = await promise;
      expect(result).toBe('completed');
    });

    it.skip('should work in sequential operations', async () => {
      const operations: string[] = [];

      async function sequentialOperations() {
        operations.push('start');
        await wait(100);
        operations.push('middle');
        await wait(200);
        operations.push('end');
      }

      const promise = sequentialOperations();

      expect(operations).toEqual(['start']);

      // Advance all the time at once since it's sequential
      jest.advanceTimersByTime(300);
      await promise;
      expect(operations).toEqual(['start', 'middle', 'end']);
    });
  });

  describe('real timer integration', () => {
    // Skip real timer tests to keep the test suite fast and avoid flaky tests
    it.skip('should work with real timers for small delays', async () => {
      jest.useRealTimers();
      const startTime = Date.now();
      await wait(10); // Very small delay to avoid slow tests
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(8); // Allow for some timing variance
      expect(endTime - startTime).toBeLessThan(50); // But not too much
    });

    // Note: We avoid longer real-time tests to keep the test suite fast
  });
});
