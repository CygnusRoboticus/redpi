import Controller from '@ember/controller';
import { task, TaskStrategy } from 'concurrency-light';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TE from 'fp-ts/lib/TaskEither';
import Link from 'redpi/pods/link/model';

const oneDay = 1000 * 60 * 60 * 24;
const twoMinutes = 1000 * 60 * 2;
const oneWeek = oneDay * 7;

export default class ApplicationController extends Controller {
  model: Link | null = null;

  after?: string;
  count = 25;

  debounceTime = twoMinutes;
  repeatDelay = oneWeek;
  historyStorageKey = 'history'

  get debug() {
    return window.location.search.includes('debug=');
  }

  @task({ strategy: TaskStrategy.Restart, debounce: twoMinutes })
  *loadNextImage() {
    this.resetPages();
    yield this.loadImage();
  }

  @task({ strategy: TaskStrategy.Drop, debounce: oneDay })
  *resetPages() {
    this.after = undefined;
  }

  clearHistory() {
    window.localStorage.removeItem(this.historyStorageKey);
  }

  loadImage = pipe(
    TE.tryCatch(
      () => this.store.query('link', {
        sort: 'top',
        count: this.count,
        after: this.after,
      }),
      () => new Error("Failed to retrieve links")
    ),
    TE.map(links => {
      const history = this.getHistory();
      const repeatTime = Date.now() - this.repeatDelay;
      const usable = links.toArray().find(link => this.isImage(link.url) && !history[link.id] || history[link.id] < repeatTime);
      if (usable) {
        this.model = usable;
        this.setHistoryTime(usable.id);
        this.loadNextImage();
      } else {
        this.after = links.toArray().slice(-1)[0].id;
        this.loadImage();
      }
    }),
  );

  private formats = ["jpeg", "jpg", "gif", "png", "apng", "svg", "bmp", "webp"];
  private isImage(url?: string) {
    return url && this.formats.some(f => url.endsWith(`.${f}`));
  }

  private getHistory(): { [id: string]: number } {
    const history = window.localStorage.getItem(this.historyStorageKey);
    return history ? JSON.parse(history) : {};
  }

  private setHistoryTime(id: string) {
    const history = this.getHistory();
    const now = Date.now();
    const repeatTime = now - this.repeatDelay;
    history[id] = now;
    Object.entries(history).forEach(([historyId, time]) => {
      if (time < repeatTime) {
        delete history[historyId];
      }
    });
    console.log('Set history: ', history);
    window.localStorage.setItem(this.historyStorageKey, JSON.stringify(history));
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'application': ApplicationController;
  }
}
