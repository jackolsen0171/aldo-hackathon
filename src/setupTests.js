// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill for TextDecoder in test environment
if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = class TextDecoder {
        decode(input) {
            if (input instanceof Uint8Array) {
                return String.fromCharCode.apply(null, input);
            }
            return input.toString();
        }
    };
}

// Polyfill for TextEncoder in test environment
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = class TextEncoder {
        encode(input) {
            const result = new Uint8Array(input.length);
            for (let i = 0; i < input.length; i++) {
                result[i] = input.charCodeAt(i);
            }
            return result;
        }
    };
}
