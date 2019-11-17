import Route from '@ember/routing/route';
import ApplicationController from 'redpi/pods/application/controller';

export default class ApplicationRoute extends Route {
  setupController(controller: ApplicationController) {
    if (controller.debug) {
      controller.clearHistory();
    }
    controller.loadImage();
  }
}
