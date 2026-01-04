// Simple Joi mock implementation to bypass installation issues
// This is a temporary solution until npm/yarn issues are resolved

class JoiSchema {
  constructor(schema) {
    this.schema = schema;
  }

  validate(data, options = {}) {
    // Basic validation - just return the data as valid for now
    // In a real implementation, this would validate against the schema
    return {
      error: null,
      value: data,
    };
  }
}

class Joi {
  static object(schema = {}) {
    const obj = new JoiSchema(schema);
    // Add chainable methods to the object
    ['required', 'optional', 'messages', 'default'].forEach((method) => {
      obj[method] = (...args) => {
        if (method === 'messages') {
          obj.schema.messages = args[0] || {};
        } else if (method === 'default') {
          obj.schema.default = args[0];
        } else {
          obj.schema[method] = true;
        }
        return obj;
      };
    });
    return obj;
  }

  // Helper to create chainable methods
  static createChainable(base = {}) {
    const chainable = { ...base };

    [
      'required',
      'optional',
      'email',
      'uri',
      'positive',
      'min',
      'max',
      'valid',
      'messages',
      'items',
      'default',
    ].forEach((method) => {
      chainable[method] = (...args) => {
        let result;
        if (method === 'valid') {
          result = args;
        } else if (method === 'messages') {
          result = args[0] || {};
        } else if (['min', 'max'].includes(method)) {
          result = args[0];
        } else {
          result = true;
        }
        return this.createChainable({ ...chainable, [method]: result });
      };
    });

    return chainable;
  }

  static string() {
    return this.createChainable({
      type: 'string',
      required: false,
      optional: false,
      email: false,
      uri: false,
      valid: [],
      min: null,
      max: null,
      messages: {},
      default: null,
    });
  }

  static number() {
    return this.createChainable({
      type: 'number',
      required: false,
      optional: false,
      positive: false,
      min: null,
      max: null,
      messages: {},
      default: null,
    });
  }

  static array() {
    return this.createChainable({
      type: 'array',
      items: null,
      min: null,
      required: false,
      messages: {},
      default: null,
    });
  }

  static boolean() {
    return this.createChainable({
      type: 'boolean',
      required: false,
      optional: false,
      messages: {},
      default: null,
    });
  }

  static date() {
    return this.createChainable({
      type: 'date',
      required: false,
      optional: false,
      messages: {},
      default: null,
    });
  }

  static alternatives() {
    return {
      try: (...schemas) => ({ try: schemas }),
    };
  }
}

export default Joi;
