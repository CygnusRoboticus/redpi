import Controller from '@ember/controller';
import { htmlSafe } from '@ember/string';
import { task, TaskStrategy, timeout } from 'concurrency-light';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TA from 'fp-ts/lib/Task';
import * as TE from 'fp-ts/lib/TaskEither';
import Link from 'redpi/pods/link/model';

const minutesToMS = (minutes: number) => 1000 * 64 * minutes;
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export default class ApplicationController extends Controller {
  static queryParams = ['debug', 'debounce', 'searchReset', 'repeatRandom']
  model: Link | null = null;
  links: Link[] | null = null;

  after?: string;
  count = 25;
  progress = 0;
  progressStyle = htmlSafe("width: 0%");

  historyStorageKey = 'history'

  debug = 0;
  debounce = 2;
  searchReset = 60 * 24;
  repeatRandom = 60 * 24 * 7;

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
    TE.rightIO(() => {
      return this.links
        ? TE.right(this.links)
        : pipe(
          TE.tryCatch(
            () => this.store.query('link', {
              sort: 'top',
              count: this.count,
              after: this.after,
            }),
            () => new Error("Failed to retrieve links")
          ),
          TE.map(result => {
            this.links = result.toArray()
            console.log(this.links);
            return this.links;
          }),
        );
    }),
    TE.chain(task => task),
    TE.map(links => {
      const history = this.getHistory();
      const usable = links.toArray().find(link => this.isImage(link.url) && !history[link.id]);
      if (usable) {
        this.model = usable;
        this.setHistoryTime(usable.id);
        this.loadNextImage();
        this.updateProgress(true);
      } else {
        this.after = links.slice(-1)[0].id;
        this.links = null;
        TA.delay(1000)(TA.fromIO(() => this.loadImage()))();
      }
    }),
  );

  private formats = ["jpeg", "jpg", "gif", "png", "apng", "svg", "bmp", "webp"];
  private isImage(url?: string) {
    return url && this.formats.some(f => url.includes(`.${f}`));
  }

  private getHistory(): { [id: string]: number } {
    const history = window.localStorage.getItem(this.historyStorageKey);
    return history ? JSON.parse(history) : {};
  }

  private setHistoryTime(id: string) {
    const history = this.getHistory();
    const now = Date.now();
    const repeatTime = now + rand(0, minutesToMS(this.repeatRandom));
    history[id] = repeatTime;
    Object.entries(history).forEach(([historyId, time]) => {
      if (time < now) {
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
