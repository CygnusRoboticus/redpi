import DS from 'ember-data';

export default class Linkpter extends DS.JSONAPIAdapter {
  host = 'https://www.reddit.com'

  pathForType() {
    return `${window.location.pathname.replace('/', '')}.json`;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your adapters.
declare module 'ember-data/types/registries/adapter' {
  export default interface AdapterRegistry {
    'link': Linkpter;
  }
}
