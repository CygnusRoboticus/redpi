import DS from 'ember-data';

export default class Link extends DS.Model {
  @DS.attr('string') subreddit?: string;   // "ImaginaryDruids"
  @DS.attr('string') title?: string;       // "Druid Lyrist by Mark Zug"
  @DS.attr('string') author?: string;      // "FaeryKnight"
  @DS.attr('string') url?: string;         // "https://i.redd.it/irvmz5bb53z31.jpg"
  @DS.attr('number') created_utc?: number; // 1573926270
}

// DO NOT DELETE: this is how TypeScript knows how to look up your models.
declare module 'ember-data/types/registries/model' {
  export default interface ModelRegistry {
    'link': Link;
  }
}
