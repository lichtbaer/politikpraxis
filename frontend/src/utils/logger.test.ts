import { describe, it, expect, vi, afterEach } from 'vitest';
import { logger, setLogSink } from './logger';

describe('logger sink (Qualitätsplan 2.3: Engine-Fehler erreichen das Error-Tracking)', () => {
  afterEach(() => {
    setLogSink(null);
    vi.restoreAllMocks();
  });

  it('leitet warn und error an den registrierten Sink weiter, info/debug nicht', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const sink = vi.fn();
    setLogSink(sink);

    logger.info('nur Konsole');
    logger.warn('Warnung', { a: 1 });
    logger.error('Fehler', { error: new Error('boom') });

    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink).toHaveBeenNthCalledWith(1, 'warn', 'Warnung', { a: 1 });
    expect(sink.mock.calls[1][0]).toBe('error');
  });

  it('ein werfender Sink bricht das Logging nicht ab', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setLogSink(() => {
      throw new Error('sink kaputt');
    });
    expect(() => logger.error('Fehler')).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});
