/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { UnsuccessfulWorkflowExecution } from '@angular-devkit/schematics';
import { NodeWorkflow } from '@angular-devkit/schematics/tools';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';
import { PackageManager } from '../lib/config/schema';
import { Command } from '../models/command';
import { Arguments } from '../models/interface';
import { SchematicEngineHost } from '../models/schematic-engine-host';
import { colors } from '../utilities/color';
import { runTempPackageBin } from '../utilities/install-package';
import { writeErrorToLogFile } from '../utilities/log-file';
import { ensureCompatibleNpm, getPackageManager } from '../utilities/package-manager';
import {
  PackageIdentifier,
  PackageManifest,
  PackageMetadata,
  fetchPackageManifest,
  fetchPackageMetadata,
} from '../utilities/package-metadata';
import {
  PackageTreeNode,
  findPackageJson,
  getProjectDependencies,
  readPackageJson,
} from '../utilities/package-tree';
import { Schema as UpdateCommandSchema } from './update';

const npa = require('npm-package-arg') as (selector: string) => PackageIdentifier;
const pickManifest = require('npm-pick-manifest') as (
  metadata: PackageMetadata,
  selector: string,
) => PackageManifest;

const oldConfigFileNames = ['.angular-cli.json', 'angular-cli.json'];

const NG_VERSION_9_POST_MSG = colors.cyan(
  '\n你的项目已经升级到了 Angular 9!\n' +
  '欲知详情，参见 https://v9.angular.cn/guide/updating-to-version-9',
);

/**
 * Disable CLI version mismatch checks and forces usage of the invoked CLI
 * instead of invoking the local installed version.
 */
const disableVersionCheckEnv = process.env['NG_DISABLE_VERSION_CHECK'];
const disableVersionCheck =
  disableVersionCheckEnv !== undefined &&
  disableVersionCheckEnv !== '0' &&
  disableVersionCheckEnv.toLowerCase() !== 'false';

export class UpdateCommand extends Command<UpdateCommandSchema> {
  public readonly allowMissingWorkspace = true;
  private workflow!: NodeWorkflow;
  private packageManager = PackageManager.Npm;

  async initialize() {
    this.packageManager = await getPackageManager(this.context.root);
    this.workflow = new NodeWorkflow(
      this.context.root,
      {
        packageManager: this.packageManager,
        // __dirname -> favor @schematics/update from this package
        // Otherwise, use packages from the active workspace (migrations)
        resolvePaths: [__dirname, this.context.root],
        schemaValidation: true,
        engineHostCreator: (options) => new SchematicEngineHost(options.resolvePaths),
      },
    );
  }

  private async executeSchematic(
    collection: string,
    schematic: string,
    options = {},
  ): Promise<{ success: boolean; files: Set<string> }> {
    let error = false;
    let logs: string[] = [];
    const files = new Set<string>();

    const reporterSubscription = this.workflow.reporter.subscribe(event => {
      // Strip leading slash to prevent confusion.
      const eventPath = event.path.startsWith('/') ? event.path.substr(1) : event.path;

      switch (event.kind) {
        case 'error':
          error = true;
          const desc = event.description == 'alreadyExist' ? '已存在。' : '不存在。';
          this.logger.error(`错误! ${eventPath} ${desc}.`);
          break;
        case 'update':
          logs.push(`${colors.cyan('更新')} ${eventPath} (${event.content.length} 字节)`);
          files.add(eventPath);
          break;
        case 'create':
          logs.push(`${colors.green('创建')} ${eventPath} (${event.content.length} 字节)`);
          files.add(eventPath);
          break;
        case 'delete':
          logs.push(`${colors.yellow('删除')} ${eventPath}`);
          files.add(eventPath);
          break;
        case 'rename':
          const eventToPath = event.to.startsWith('/') ? event.to.substr(1) : event.to;
          logs.push(`${colors.blue('改名')} ${eventPath} => ${eventToPath}`);
          files.add(eventPath);
          break;
      }
    });

    const lifecycleSubscription = this.workflow.lifeCycle.subscribe(event => {
      if (event.kind == 'end' || event.kind == 'post-tasks-start') {
        if (!error) {
          // Output the logging queue, no error happened.
          logs.forEach(log => this.logger.info(`  ${log}`));
          logs = [];
        }
      }
    });

    // TODO: Allow passing a schematic instance directly
    try {
      await this.workflow
        .execute({
          collection,
          schematic,
          options,
          logger: this.logger,
        })
        .toPromise();

      reporterSubscription.unsubscribe();
      lifecycleSubscription.unsubscribe();

      return { success: !error, files };
    } catch (e) {
      if (e instanceof UnsuccessfulWorkflowExecution) {
        this.logger.error(`${colors.symbols.cross} 迁移失败。查看上方的信息以了解详情。\n`);
      } else {
        const logPath = writeErrorToLogFile(e);
        this.logger.fatal(
          `${colors.symbols.cross} 迁移失败：${e.message}\n` +
          `  参见 "${logPath}" 以了解详情。\n`,
        );
      }

      return { success: false, files };
    }
  }

  /**
   * @return Whether or not the migration was performed successfully.
   */
  private async executeMigration(
    packageName: string,
    collectionPath: string,
    migrationName: string,
    commit?: boolean,
  ): Promise<boolean> {
    const collection = this.workflow.engine.createCollection(collectionPath);
    const name = collection.listSchematicNames().find(name => name === migrationName);
    if (!name) {
      this.logger.error(`不能找到 '${packageName}' 包中的 '${migrationName}' 迁移。`);

      return false;
    }

    const schematic = this.workflow.engine.createSchematic(name, collection);

    this.logger.info(
      colors.cyan(`** 正在执行 '${packageName}' 包中的 '${migrationName}'。**\n`),
    );

    return this.executePackageMigrations([schematic.description], packageName, commit);
  }

  /**
   * @return Whether or not the migrations were performed successfully.
   */
  private async executeMigrations(
    packageName: string,
    collectionPath: string,
    range: semver.Range,
    commit?: boolean,
  ): Promise<boolean> {
    const collection = this.workflow.engine.createCollection(collectionPath);
    const migrations = [];

    for (const name of collection.listSchematicNames()) {
      const schematic = this.workflow.engine.createSchematic(name, collection);
      const description = schematic.description as typeof schematic.description & {
        version?: string;
      };
      description.version = coerceVersionNumber(description.version) || undefined;
      if (!description.version) {
        continue;
      }

      if (semver.satisfies(description.version, range, { includePrerelease: true })) {
        migrations.push(description as typeof schematic.description & { version: string });
      }
    }

    migrations.sort((a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name));

    if (migrations.length === 0) {
      return true;
    }

    this.logger.info(
      colors.cyan(`** 正在执行 '${packageName}' 包中的迁移。 **\n`),
    );

    return this.executePackageMigrations(migrations, packageName, commit);
  }

  private async executePackageMigrations(
    migrations: Iterable<{ name: string; description: string; collection: { name: string }}>,
    packageName: string,
    commit = false,
  ): Promise<boolean> {
    for (const migration of migrations) {
      const [title, ...description] = migration.description.split('. ');

      this.logger.info(
        colors.cyan(colors.symbols.pointer) + ' ' +
        colors.bold(title.endsWith('.') ? title : title + '.'),
      );

      if (description.length) {
        this.logger.info('  ' + description.join('.\n  '));
      }

      const result = await this.executeSchematic(migration.collection.name, migration.name);
      if (!result.success) {
        return false;
      }

      this.logger.info('  迁移完毕。');

      // Commit migration
      if (commit) {
        const commitPrefix = `${packageName} migration - ${migration.name}`;
        const commitMessage = migration.description
          ? `${commitPrefix}\n\n${migration.description}`
          : commitPrefix;
        const committed = this.commit(commitMessage);
        if (!committed) {
          // Failed to commit, something went wrong. Abort the update.
          return false;
        }
      }

      this.logger.info(''); // Extra trailing newline.
    }

    return true;
  }

  // tslint:disable-next-line:no-big-function
  async run(options: UpdateCommandSchema & Arguments) {
    ensureCompatibleNpm();

    // Check if the current installed CLI version is older than the latest version.
    if (!disableVersionCheck && await this.checkCLILatestVersion(options.verbose, options.next)) {
      this.logger.warn(
        `已安装的本地 Angular CLI 版本比最后一个${options.next ? '与发布' : '稳定'}版旧。\n` +
        '正在安装临时版本以执行更新。',
      );

      return runTempPackageBin(
        `@angular/cli@${options.next ? 'next' : 'latest'}`,
        this.logger,
        this.packageManager,
        process.argv.slice(2),
      );
    }

    if (options.all) {
      const updateCmd = this.packageManager === PackageManager.Yarn
        ? `'yarn upgrade-interactive' or 'yarn upgrade'`
        : `'${this.packageManager} update'`;

      this.logger.warn(`
        '--all' 功能已经移除，因为我们不建议一次更新多个包。
        要更新工作空间的 'package.json' 中那些未提供 'ng update' 能力的包，请使用 ${updateCmd} 代替。
        更新了那些提供了 'ng update' 能力的包之后，会运行包管理器的更新命令。
      `);

      return 0;
    }

    const packages: PackageIdentifier[] = [];
    for (const request of options['--'] || []) {
      try {
        const packageIdentifier = npa(request);

        // only registry identifiers are supported
        if (!packageIdentifier.registry) {
          this.logger.error(`包 '${request}' 不是一个有效的 Registry 包标识符。`);

          return 1;
        }

        if (packages.some(v => v.name === packageIdentifier.name)) {
          this.logger.error(`指定了重复的包 '${packageIdentifier.name}'。`);

          return 1;
        }

        if (options.migrateOnly && packageIdentifier.rawSpec) {
          this.logger.warn('当使用 "migrate-only" 选项时，包说明符不起作用。');
        }

        // If next option is used and no specifier supplied, use next tag
        if (options.next && !packageIdentifier.rawSpec) {
          packageIdentifier.fetchSpec = 'next';
        }

        packages.push(packageIdentifier);
      } catch (e) {
        this.logger.error(e.message);

        return 1;
      }
    }

    if (!options.migrateOnly && (options.from || options.to)) {
      this.logger.error('"from" 或 "to" 选项只能和 "migrate-only" 选项一起使用。');

      return 1;
    }

    // If not asking for status then check for a clean git repository.
    // This allows the user to easily reset any changes from the update.
    if (packages.length && !this.checkCleanGit()) {
      if (options.allowDirty) {
        this.logger.warn(
          '当前代码仓不是干净的，更新时带来的修改可能和现存的修改混在一起。',
        );
      } else {
        this.logger.error(
          '当前代码仓不是干净的，请在更新前提交或暂存所有修改。',
        );

        return 2;
      }
    }

    this.logger.info(`正在使用包管理器：'${this.packageManager}'`);

    // Special handling for Angular CLI 1.x migrations
    if (
      options.migrateOnly === undefined &&
      options.from === undefined &&
      packages.length === 1 &&
      packages[0].name === '@angular/cli' &&
      this.workspace &&
      oldConfigFileNames.includes(path.basename(this.workspace.filePath))
    ) {
      options.migrateOnly = true;
      options.from = '1.0.0';
    }

    this.logger.info('正在收集已安装的依赖...');

    const rootDependencies = await getProjectDependencies(this.context.root);

    this.logger.info(`发现了 ${rootDependencies.size} 个依赖。`);

    if (packages.length === 0) {
      // Show status
      const { success } = await this.executeSchematic('@schematics/update', 'update', {
        force: options.force || false,
        next: options.next || false,
        verbose: options.verbose || false,
        packageManager: this.packageManager,
        packages: [],
      });

      return success ? 0 : 1;
    }

    if (options.migrateOnly) {
      if (!options.from && typeof options.migrateOnly !== 'string') {
        this.logger.error('当使用不带迁移名的 "migrate-only" 选项时，"from" 选项是必要的。');

        return 1;
      } else if (packages.length !== 1) {
        this.logger.error(
          '使用 "migrate-only" 选项时，只能指定一个包。',
        );

        return 1;
      }

      if (options.next) {
        this.logger.warn('当使用 "migrate-only" 选项时，"next" 选项不起作用。');
      }

      const packageName = packages[0].name;
      const packageDependency = rootDependencies.get(packageName);
      let packagePath = packageDependency?.path;
      let packageNode = packageDependency?.package;
      if (packageDependency && !packageNode) {
        this.logger.error('在 package.json 中找到了包，但没有安装。');

        return 1;
      } else if (!packageDependency) {
        // Allow running migrations on transitively installed dependencies
        // There can technically be nested multiple versions
        // TODO: If multiple, this should find all versions and ask which one to use
        const packageJson = findPackageJson(this.context.root, packageName);
        if (packageJson) {
          packagePath = path.dirname(packageJson);
          packageNode = await readPackageJson(packageJson);
        }
      }

      if (!packageNode || !packagePath) {
        this.logger.error('包未安装。');

        return 1;
      }

      const updateMetadata = packageNode['ng-update'];
      let migrations = updateMetadata?.migrations;
      if (migrations === undefined) {
        this.logger.error('包没有提供迁移。');

        return 1;
      } else if (typeof migrations !== 'string') {
        this.logger.error('包里包含了错误的迁移字段。');

        return 1;
      } else if (path.posix.isAbsolute(migrations) || path.win32.isAbsolute(migrations)) {
        this.logger.error(
          '包里包含一个无效的迁移字段。不允许使用绝对路径。',
        );

        return 1;
      }

      // Normalize slashes
      migrations = migrations.replace(/\\/g, '/');

      if (migrations.startsWith('../')) {
        this.logger.error(
          '包里包含一个无效的迁移字段。' +
            '路径不能位于此包的根路径之外。',
        );

        return 1;
      }

      // Check if it is a package-local location
      const localMigrations = path.join(packagePath, migrations);
      if (fs.existsSync(localMigrations)) {
        migrations = localMigrations;
      } else {
        // Try to resolve from package location.
        // This avoids issues with package hoisting.
        try {
          migrations = require.resolve(migrations, { paths: [packagePath] });
        } catch (e) {
          if (e.code === 'MODULE_NOT_FOUND') {
            this.logger.error('未找到包的迁移。');
          } else {
            this.logger.error(`不能解析包的迁移。 [${e.message}]`);
          }

          return 1;
        }
      }

      let success = false;
      if (typeof options.migrateOnly == 'string') {
        success = await this.executeMigration(
          packageName,
          migrations,
          options.migrateOnly,
          options.createCommits,
        );
      } else {
        const from = coerceVersionNumber(options.from);
        if (!from) {
          this.logger.error(`"from" value [${options.from}] is not a valid version.`);

          return 1;
        }

        const migrationRange = new semver.Range(
          '>' + from + ' <=' + (options.to || packageNode.version),
        );

        success = await this.executeMigrations(
          packageName,
          migrations,
          migrationRange,
          options.createCommits,
        );
      }

      if (success) {
        if (
          packageName === '@angular/core'
          && options.from
          && +options.from.split('.')[0] < 9
          && (options.to || packageNode.version).split('.')[0] === '9'
        ) {
          this.logger.info(NG_VERSION_9_POST_MSG);
        }

        return 0;
      }

      return 1;
    }

    const requests: {
      identifier: PackageIdentifier;
      node: PackageTreeNode;
    }[] = [];

    // Validate packages actually are part of the workspace
    for (const pkg of packages) {
      const node = rootDependencies.get(pkg.name);
      if (!node?.package) {
        this.logger.error(`包 '${pkg.name}' 不是依赖项。`);

        return 1;
      }

      // If a specific version is requested and matches the installed version, skip.
      if (pkg.type === 'version' && node.package.version === pkg.fetchSpec) {
        this.logger.info(`包 '${pkg.name}' 已经位于 '${pkg.fetchSpec}'。`);
        continue;
      }

      requests.push({ identifier: pkg, node });
    }

    if (requests.length === 0) {
      return 0;
    }

    const packagesToUpdate: string[] = [];

    this.logger.info('正在从 registry 获取包的依赖元数据...');
    for (const { identifier: requestIdentifier, node } of requests) {
      const packageName = requestIdentifier.name;

      let metadata;
      try {
        // Metadata requests are internally cached; multiple requests for same name
        // does not result in additional network traffic
        metadata = await fetchPackageMetadata(packageName, this.logger, {
          verbose: options.verbose,
        });
      } catch (e) {
        this.logger.error(`获取包 '${packageName}' 的元数据失败：` + e.message);

        return 1;
      }

      // Try to find a package version based on the user requested package specifier
      // registry specifier types are either version, range, or tag
      let manifest: PackageManifest | undefined;
      if (
        requestIdentifier.type === 'version' ||
        requestIdentifier.type === 'range' ||
        requestIdentifier.type === 'tag'
      ) {
        try {
          manifest = pickManifest(metadata, requestIdentifier.fetchSpec);
        } catch (e) {
          if (e.code === 'ETARGET') {
            // If not found and next was used and user did not provide a specifier, try latest.
            // Package may not have a next tag.
            if (
              requestIdentifier.type === 'tag' &&
              requestIdentifier.fetchSpec === 'next' &&
              !requestIdentifier.rawSpec
            ) {
              try {
                manifest = pickManifest(metadata, 'latest');
              } catch (e) {
                if (e.code !== 'ETARGET' && e.code !== 'ENOVERSIONS') {
                  throw e;
                }
              }
            }
          } else if (e.code !== 'ENOVERSIONS') {
            throw e;
          }
        }
      }

      if (!manifest) {
        this.logger.error(
          `由 '${requestIdentifier.raw}' 指定的包在 registry 中不存在。`,
        );

        return 1;
      }

      if (manifest.version === node.package?.version) {
        this.logger.info(`包 '${packageName}' 已经是最新的了。`);
        continue;
      }

      packagesToUpdate.push(requestIdentifier.toString());
    }

    if (packagesToUpdate.length === 0) {
      return 0;
    }

    const { success } = await this.executeSchematic('@schematics/update', 'update', {
      verbose: options.verbose || false,
      force: options.force || false,
      next: !!options.next,
      packageManager: this.packageManager,
      packages: packagesToUpdate,
      migrateExternal: true,
    });

    if (success && options.createCommits) {
      const committed = this.commit(
          `Angular CLI update for packages - ${packagesToUpdate.join(', ')}`);
      if (!committed) {
        return 1;
      }
    }

    // This is a temporary workaround to allow data to be passed back from the update schematic
    // tslint:disable-next-line: no-any
    const migrations = (global as any).externalMigrations as {
      package: string;
      collection: string;
      from: string;
      to: string;
    }[];

    if (success && migrations) {
      for (const migration of migrations) {
        // Resolve the package from the workspace root, as otherwise it will be resolved from the temp
        // installed CLI version.
        const packagePath = require.resolve(migration.package, { paths: [this.context.root] });
        let migrations;

        // Check if it is a package-local location
        const localMigrations = path.join(packagePath, migration.collection);
        if (fs.existsSync(localMigrations)) {
          migrations = localMigrations;
        } else {
          // Try to resolve from package location.
          // This avoids issues with package hoisting.
          try {
            migrations = require.resolve(migration.collection, { paths: [packagePath] });
          } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
              this.logger.error(`未找到包 (${migration.package}) 的迁移。`);
            } else {
              this.logger.error(
                `不能解析包 (${migration.package}) 的迁移。 [${e.message}]`,
              );
            }

            return 1;
          }
        }
        const result = await this.executeMigrations(
          migration.package,
          migrations,
          new semver.Range('>' + migration.from + ' <=' + migration.to),
          options.createCommits,
        );

        if (!result) {
          return 0;
        }
      }

      if (migrations.some(m => m.package === '@angular/core' && m.to.split('.')[0] === '9' && +m.from.split('.')[0] < 9)) {
        this.logger.info(NG_VERSION_9_POST_MSG);
      }
    }

    return success ? 0 : 1;
  }

  /**
   * @return Whether or not the commit was successful.
   */
  private commit(message: string): boolean {
    // Check if a commit is needed.
    let commitNeeded: boolean;
    try {
      commitNeeded = hasChangesToCommit();
    } catch (err) {
      this.logger.error(`  读取 Git 树失败：\n${err.stderr}`);

      return false;
    }

    if (!commitNeeded) {
      this.logger.info('  迁移后没有要提交的信息。');

      return true;
    }

    // Commit changes and abort on error.
    try {
      createCommit(message);
    } catch (err) {
      this.logger.error(
        `提交更新失败 (${message})：\n${err.stderr}`);

      return false;
    }

    // Notify user of the commit.
    const hash = findCurrentGitSha();
    const shortMessage = message.split('\n')[0];
    if (hash) {
      this.logger.info(`  已提交迁移步骤 (${getShortHash(hash)})：${
          shortMessage}.`);
    } else {
      // Commit was successful, but reading the hash was not. Something weird happened,
      // but nothing that would stop the update. Just log the weirdness and continue.
      this.logger.info(`  已提交迁移步骤：${shortMessage}.`);
      this.logger.warn('  为最近的提交查找哈希值失败。不过还是能继续。');
    }

    return true;
  }

  private checkCleanGit(): boolean {
    try {
      const topLevel = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: 'pipe' });
      const result = execSync('git status --porcelain', { encoding: 'utf8', stdio: 'pipe' });
      if (result.trim().length === 0) {
        return true;
      }

      // Only files inside the workspace root are relevant
      for (const entry of result.split('\n')) {
        const relativeEntry = path.relative(
          path.resolve(this.context.root),
          path.resolve(topLevel.trim(), entry.slice(3).trim()),
        );

        if (!relativeEntry.startsWith('..') && !path.isAbsolute(relativeEntry)) {
          return false;
        }
      }
    } catch {}

    return true;
  }

  /**
   * Checks if the current installed CLI version is older than the latest version.
   * @returns `true` when the installed version is older.
  */
  private async checkCLILatestVersion(verbose = false, next = false): Promise<boolean> {
    const { version: installedCLIVersion } = require('../package.json');

    const LatestCLIManifest = await fetchPackageManifest(
      `@angular/cli@${next ? 'next' : 'latest'}`,
      this.logger,
      {
        verbose,
        usingYarn: this.packageManager === PackageManager.Yarn,
      },
    );

    return semver.lt(installedCLIVersion, LatestCLIManifest.version);
  }
}

/**
 * @return Whether or not the working directory has Git changes to commit.
 */
function hasChangesToCommit(): boolean {
  // List all modified files not covered by .gitignore.
  const files = execSync('git ls-files -m -d -o --exclude-standard').toString();

  // If any files are returned, then there must be something to commit.
  return files !== '';
}

/**
 * Precondition: Must have pending changes to commit, they do not need to be staged.
 * Postcondition: The Git working tree is committed and the repo is clean.
 * @param message The commit message to use.
 */
function createCommit(message: string) {
  // Stage entire working tree for commit.
  execSync('git add -A', { encoding: 'utf8', stdio: 'pipe' });

  // Commit with the message passed via stdin to avoid bash escaping issues.
  execSync('git commit --no-verify -F -', { encoding: 'utf8', stdio: 'pipe', input: message });
}

/**
 * @return The Git SHA hash of the HEAD commit. Returns null if unable to retrieve the hash.
 */
function findCurrentGitSha(): string | null {
  try {
    const hash = execSync('git rev-parse HEAD', {encoding: 'utf8', stdio: 'pipe'});

    return hash.trim();
  } catch {
    return null;
  }
}

function getShortHash(commitHash: string): string {
  return commitHash.slice(0, 9);
}

function coerceVersionNumber(version: string | undefined): string | null {
  if (!version) {
    return null;
  }

  if (!version.match(/^\d{1,30}\.\d{1,30}\.\d{1,30}/)) {
    const match = version.match(/^\d{1,30}(\.\d{1,30})*/);

    if (!match) {
      return null;
    }

    if (!match[1]) {
      version = version.substr(0, match[0].length) + '.0.0' + version.substr(match[0].length);
    } else if (!match[2]) {
      version = version.substr(0, match[0].length) + '.0' + version.substr(match[0].length);
    } else {
      return null;
    }
  }

  return semver.valid(version);
}
