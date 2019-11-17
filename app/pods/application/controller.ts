import Controller from '@ember/controller';
import { htmlSafe } from '@ember/string';
import { task, TaskStrategy, timeout } from 'concurrency-light';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TE from 'fp-ts/lib/TaskEither';
import Link from 'redpi/pods/link/model';

const minutesToMS = (minutes: number) => 1000 * 64 * minutes;

export default class ApplicationController extends Controller {
  static queryParams = ['debug', 'debounce', 'searchReset', 'repeatReset']
  model: Link | null = null;

  after?: string;
  count = 25;
  progress = 0;
  progressStyle = htmlSafe("width: 0%");

  historyStorageKey = 'history'

  debug = 0;
  debounce = 2;
  searchReset = 60 * 24;
  repeatReset = 60 * 24 * 7;

  @task({ strategy: TaskStrategy.Restart })
  *loadNextImage() {
    yield timeout(minutesToMS(this.debounce));
    this.resetPages();
    yield this.loadImage();
  }

  @task({ strategy: TaskStrategy.Drop })
  *resetPages() {
    yield timeout(minutesToMS(this.searchReset));
    this.after = undefined;
  }

  @task({ strategy: TaskStrategy.Restart })
  *updateProgress(reset = false) {
    const progress = reset ? 0 : this.progress + (100 / (this.debounce * 60));
    this.setProperties({
      progress,
      progressStyle: htmlSafe(`width: ${progress}%`)
    });
    yield timeout(1000);
    this.updateProgress();
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
      const repeatTime = Date.now() - minutesToMS(this.repeatReset);
      const usable = links.toArray().find(link => this.isImage(link.url) && !history[link.id] || history[link.id] < repeatTime);
      if (usable) {
        this.model = usable;
        this.setHistoryTime(usable.id);
        this.loadNextImage();
        this.updateProgress(true);
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
    const repeatTime = now - minutesToMS(this.repeatReset);
    history[id] = now;
    Object.entries(history).forEach(([historyId, time]) => {
      if (time < repeatTime) {
        delete history[historyId];
      }
    });
    console.log('History: ', history);
    window.localStorage.setItem(this.historyStorageKey, JSON.stringify(history));
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'application': ApplicationController;
  }
}
