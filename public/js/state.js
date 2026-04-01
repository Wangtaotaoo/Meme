class State {
  constructor() {
    this._state = {};
    this._listeners = {};
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    this._state[key] = value;
    this._notify(key, value);
  }

  subscribe(key, callback) {
    if (!this._listeners[key]) {
      this._listeners[key] = [];
    }
    this._listeners[key].push(callback);
    // Return unsubscribe function
    return () => {
      this._listeners[key] = this._listeners[key].filter(cb => cb !== callback);
    };
  }

  _notify(key, value) {
    if (this._listeners[key]) {
      for (const cb of this._listeners[key]) {
        cb(value);
      }
    }
  }
}

export const state = new State();
