/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Command } from '../models/command';
import { colors } from '../utilities/color';
import { Schema as AwesomeCommandSchema } from './easter-egg';

function pickOne(of: string[]): string {
  return of[Math.floor(Math.random() * of.length)];
}

export class AwesomeCommand extends Command<AwesomeCommandSchema> {
  async run() {
    const phrase = pickOne([
      `你已经有了，我啥也不用做。`,
      `我们来看看哈……没事，一切 OK！`,
      `你做得很好。`,
      `你已经做得很好了。`,
      `无事可做，已经很棒了。退出。`,
      `错误 418：你最棒了！`,
      `哇，在我的小眼睛里看到一个伟大的程序员！`,
      `无事可做……已经很棒了。`,
    ]);
    this.logger.info(colors.green(phrase));
  }
}
