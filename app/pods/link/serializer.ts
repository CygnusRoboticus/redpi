import { underscore } from '@ember/string';
import DS from 'ember-data';

export default class LinkSerializer extends DS.JSONAPISerializer {
  normalizeResponse(store: DS.Store, primaryModelClass: DS.Model, payload: { [k: string]: any }, id: string, requestType: string) {
    const hash = {
      data: payload.data.children.map((data: any) => ({
        id: data.data.name,
        type: "link",
        attributes: {
          ...data.data,
          created_utc: data.data.created_utc * 1000
        }
      }))
    };
    return super.normalizeResponse(store, primaryModelClass, hash, id, requestType);
  }

  keyForAttribute(key: string) {
    return underscore(key);
  }

  keyForRelationship(key: string) {
    return underscore(key);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your serializers.
declare module 'ember-data/types/registries/serializer' {
  export default interface SerializerRegistry {
    'link': LinkSerializer;
  }
}
