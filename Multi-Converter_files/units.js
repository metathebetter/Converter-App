// Unit definitions and conversion helpers
const UNITS = {
  length: {
    base: 'm',
    units: {
      m: { name: 'Meter', toBase: v => v, fromBase: v => v },
      km: { name: 'Kilometer', toBase: v => v * 1000, fromBase: v => v / 1000 },
      cm: { name: 'Centimeter', toBase: v => v / 100, fromBase: v => v * 100 },
      mm: { name: 'Millimeter', toBase: v => v / 1000, fromBase: v => v * 1000 },
      in: { name: 'Inch', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 },
      ft: { name: 'Foot', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
      yd: { name: 'Yard', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
      mi: { name: 'Mile', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 }
    }
  },
  weight: {
    base: 'kg',
    units: {
      kg: { name: 'Kilogram', toBase: v => v, fromBase: v => v },
      g: { name: 'Gram', toBase: v => v / 1000, fromBase: v => v * 1000 },
      mg: { name: 'Milligram', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
      lb: { name: 'Pound', toBase: v => v * 0.45359237, fromBase: v => v / 0.45359237 },
      oz: { name: 'Ounce', toBase: v => v * 0.0283495231, fromBase: v => v / 0.0283495231 }
    }
  },
  temperature: {
    base: 'c',
    units: {
      c: { name: 'Celsius', toBase: v => v, fromBase: v => v },
      f: { name: 'Fahrenheit', toBase: v => (v - 32) * 5/9, fromBase: v => (v * 9/5) + 32 },
      k: { name: 'Kelvin', toBase: v => v - 273.15, fromBase: v => v + 273.15 }
    }
  },
  volume: {
    base: 'l',
    units: {
      l: { name: 'Liter', toBase: v => v, fromBase: v => v },
      ml: { name: 'Milliliter', toBase: v => v / 1000, fromBase: v => v * 1000 },
      m3: { name: 'Cubic meter', toBase: v => v * 1000, fromBase: v => v / 1000 },
      gal: { name: 'US Gallon', toBase: v => v * 3.785411784, fromBase: v => v / 3.785411784 },
      cup: { name: 'Cup (US)', toBase: v => v * 0.2365882365, fromBase: v => v / 0.2365882365 }
    }
  },
  area: {
    base: 'm2',
    units: {
      m2: { name: 'Square meter', toBase: v => v, fromBase: v => v },
      km2: { name: 'Square kilometer', toBase: v => v * 1e6, fromBase: v => v / 1e6 },
      cm2: { name: 'Square centimeter', toBase: v => v / 10000, fromBase: v => v * 10000 },
      ft2: { name: 'Square foot', toBase: v => v * 0.09290304, fromBase: v => v / 0.09290304 },
      acre: { name: 'Acre', toBase: v => v * 4046.8564224, fromBase: v => v / 4046.8564224 },
      ha: { name: 'Hectare', toBase: v => v * 10000, fromBase: v => v / 10000 }
    }
  },
  speed: {
    base: 'm/s',
    units: {
      'm/s': { name: 'Meter per second', toBase: v => v, fromBase: v => v },
      'km/h': { name: 'Kilometer per hour', toBase: v => v / 3.6, fromBase: v => v * 3.6 },
      mph: { name: 'Mile per hour', toBase: v => v / 2.2369362921, fromBase: v => v * 2.2369362921 },
      knot: { name: 'Knot', toBase: v => v / 1.9438444924, fromBase: v => v * 1.9438444924 },
      'ft/s': { name: 'Foot per second', toBase: v => v / 3.280839895, fromBase: v => v * 3.280839895 }
    }
  },
  pressure: {
    base: 'Pa',
    units: {
      Pa: { name: 'Pascal', toBase: v => v, fromBase: v => v },
      kPa: { name: 'Kilopascal', toBase: v => v * 1000, fromBase: v => v / 1000 },
      bar: { name: 'Bar', toBase: v => v * 100000, fromBase: v => v / 100000 },
      atm: { name: 'Atmosphere', toBase: v => v * 101325, fromBase: v => v / 101325 },
      psi: { name: 'Pound per square inch', toBase: v => v * 6894.757293, fromBase: v => v / 6894.757293 },
      mmHg: { name: 'Millimeter of mercury', toBase: v => v * 133.322387, fromBase: v => v / 133.322387 }
    }
  },
  energy: {
    base: 'J',
    units: {
      J: { name: 'Joule', toBase: v => v, fromBase: v => v },
      kJ: { name: 'Kilojoule', toBase: v => v * 1000, fromBase: v => v / 1000 },
      cal: { name: 'Calorie', toBase: v => v * 4.184, fromBase: v => v / 4.184 },
      kcal: { name: 'Kilocalorie', toBase: v => v * 4184, fromBase: v => v / 4184 },
      kWh: { name: 'Kilowatt-hour', toBase: v => v * 3600000, fromBase: v => v / 3600000 },
      'ft-lb': { name: 'Foot-pound', toBase: v => v * 1.3558179483, fromBase: v => v / 1.3558179483 }
    }
  }
};

// Utility: format number with sensible precision
function formatNumber(n) {
  if (!isFinite(n)) return 'NaN';
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  if (abs >= 1) return Math.round(n * 1000000) / 1000000;
  return parseFloat(n.toPrecision(8));
}

// Convert value from one unit to another within a category
function convertValue(category, fromKey, toKey, value) {
  const defs = UNITS[category];
  if (!defs) throw new Error('Unknown category');
  const from = defs.units[fromKey];
  const to = defs.units[toKey];
  if (!from || !to) throw new Error('Unknown unit');
  const base = from.toBase(value);
  const out = to.fromBase(base);
  return out;
}
