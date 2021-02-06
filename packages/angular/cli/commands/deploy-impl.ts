/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ArchitectCommand, ArchitectCommandOptions } from '../models/architect-command';
import { Arguments } from '../models/interface';
import { Schema as DeployCommandSchema } from './deploy';

const BuilderMissing = `

未找到指定项目的目标 "deploy"。

你可以添加一个能提供发布到目标平台的能力的包。

比如：
  ng add @angular/fire
  ng add @azure/ng-deploy
  ng add @zeit/ng-deploy

可以在 npm 上寻找更多包：https://www.npmjs.com/search?q=ng%20deploy
`;

export class DeployCommand extends ArchitectCommand<DeployCommandSchema> {
  public readonly target = 'deploy';
  public readonly missingTargetError = BuilderMissing;

  public async run(options: ArchitectCommandOptions & Arguments) {
    return this.runArchitectTarget(options);
  }

  public async initialize(options: DeployCommandSchema & Arguments): Promise<void> {
    if (!options.help) {
      return super.initialize(options);
    }
  }
}
