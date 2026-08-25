import { describe, expect, it } from 'vitest';
import { csContains, eqFilter, pgArrayLiteral, pgQuote } from '@/lib/postgrest';

describe('pgQuote', () => {
  it('quotes a plain value', () => {
    expect(pgQuote('Google')).toBe('"Google"');
  });

  it('keeps commas inside the quotes', () => {
    expect(pgQuote('Bain & Company, Inc.')).toBe('"Bain & Company, Inc."');
  });

  it('escapes embedded double quotes', () => {
    expect(pgQuote('The "Big" Firm')).toBe('"The \\"Big\\" Firm"');
  });

  it('escapes backslashes before quotes', () => {
    expect(pgQuote('a\\b')).toBe('"a\\\\b"');
    expect(pgQuote('a\\"b')).toBe('"a\\\\\\"b"');
  });

  it('neutralises PostgREST grammar characters', () => {
    expect(pgQuote('a)')).toBe('"a)"');
    expect(pgQuote('f(x)')).toBe('"f(x)"');
    expect(pgQuote('{curly}')).toBe('"{curly}"');
  });

  it('passes unicode through untouched', () => {
    expect(pgQuote('Publicis Sapient — डिज़ाइन')).toBe('"Publicis Sapient — डिज़ाइन"');
  });
});

describe('pgArrayLiteral', () => {
  it('builds a single-element quoted literal', () => {
    expect(pgArrayLiteral(['Product Sense'])).toBe('{"Product Sense"}');
  });

  it('builds a multi-element literal with each element quoted', () => {
    expect(pgArrayLiteral(['A, B', 'C'])).toBe('{"A, B","C"}');
  });

  it('builds an empty literal from no values', () => {
    expect(pgArrayLiteral([])).toBe('{}');
  });
});

describe('or() condition builders', () => {
  it('csContains emits column.cs.{"value"}', () => {
    expect(csContains('company', 'Bain & Company, Inc.')).toBe('company.cs.{"Bain & Company, Inc."}');
  });

  it('eqFilter emits column.eq."value"', () => {
    expect(eqFilter('role', 'Product Management')).toBe('role.eq."Product Management"');
    expect(eqFilter('role', 'a)')).toBe('role.eq."a)"');
  });
});
