const originalStringify = JSON.stringify;

// Create a safe replacement
JSON.stringify = function (value: any, replacer?: any, space?: string | number): string {
  const bigintReplacer = function (this: any, key: string, val: any) {
    // Convert BigInt to string
    if (typeof val === 'bigint') {
      return val.toString();
    }

    // Handle original replacer if it's a function
    if (typeof replacer === 'function') {
      return replacer.call(this, key, val);
    }

    return val;
  };

  // Use original stringify with our custom replacer
  if (Array.isArray(replacer)) {
    // Filter properties first, then handle BigInt in a second pass
    const filteredValue = originalStringify(value, replacer);
    return originalStringify(JSON.parse(filteredValue), bigintReplacer, space);
  } else {
    return originalStringify(value, bigintReplacer, space);
  }
} as typeof JSON.stringify; // Type assertion to match the expected function signature
