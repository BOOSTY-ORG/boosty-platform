// Simple form-data mock implementation to bypass installation issues
// This is a temporary solution until npm/yarn issues are resolved

class FormData {
  constructor() {
    this.boundary = '----formdata-boundary-' + Math.random().toString(16);
    this.data = [];
  }

  append(name, value, options = {}) {
    this.data.push({
      name,
      value,
      filename: options.filename,
      contentType: options.contentType,
    });
  }

  getLength() {
    return this.toString().length;
  }

  toString() {
    let result = '';

    this.data.forEach((field) => {
      result += `--${this.boundary}\r\n`;
      result += `Content-Disposition: form-data; name="${field.name}"`;

      if (field.filename) {
        result += `; filename="${field.filename}"`;
      }

      result += '\r\n';

      if (field.contentType) {
        result += `Content-Type: ${field.contentType}\r\n`;
      }

      result += '\r\n';
      result += field.value;
      result += '\r\n';
    });

    result += `--${this.boundary}--\r\n`;
    return result;
  }
}

export default FormData;
