/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as open from 'open';
import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { Schema as DocCommandSchema } from './doc';

export class DocCommand extends Command<DocCommandSchema> {
  public async run(options: DocCommandSchema & Arguments) {
    if (!options.keyword) {
      this.logger.error('你可以指定一个关键字，比如 `ng doc ActivatedRoute`。');

      return 0;
    }

    let domain = 'angular.cn';

    if (options.version) {
      // version can either be a string containing "next"
      if (options.version == 'next') {
        domain = 'next.angular.cn';
        // or a number where version must be a valid Angular version (i.e. not 0, 1 or 3)
      } else if (!isNaN(+options.version) && ![0, 1, 3].includes(+options.version)) {
        domain = `v${options.version}.angular.cn`;
      } else {
        this.logger.error('版本号必须是一个数字，比如 (2, 4, 5, 6...) 或 "next"');

        return 0;
      }
    } else {
      // we try to get the current Angular version of the project
      // and use it if we can find it
      try {
        /* tslint:disable-next-line:no-implicit-dependencies */
        const currentNgVersion = (await import('@angular/core')).VERSION.major;
        domain = `v${currentNgVersion}.angular.cn`;
      } catch (e) { }
    }

    let searchUrl = `https://${domain}/api?query=${options.keyword}`;

    if (options.search) {
      searchUrl = `https://${domain}/docs?search=${options.keyword}`;
    }

    await open(searchUrl, {
      wait: false,
    });
  }
}
