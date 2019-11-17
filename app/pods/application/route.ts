import Route from '@ember/routing/route';
import ApplicationController from 'redpi/pods/application/controller';

export default class ApplicationRoute extends Route {
  queryParams = {
    debug: { refreshModel: true },
    debounce: { refreshModel: true },
    searchReset: { refreshModel: true },
    repeatReset: { refreshModel: true },
  };

  setupController(controller: ApplicationController) {
    console.log('Controller: ', controller);
    if (controller.debug) {
      controller.clearHistory();
    }
    controller.loadImage();
  }
}
